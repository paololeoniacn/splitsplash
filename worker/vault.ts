import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { Hono, type Context } from 'hono';
import { generateRecoveryCode, isRecoveryShape, normalizePassphrase } from '../shared/passphrase';
import { passkeyVerifyInput, vaultCreateInput, vaultLinkInput, vaultNewCodeInput, vaultOpenInput, vaultRecoverInput } from '../shared/schemas';
import { fromB64Url, newId, randomToken, recoveryHash, sha256, tokenHash, toB64Url } from './crypto';
import { body, fail, guardFailures, issueToken, limitWrites, pepper, rateLimit, recordFailure, type App } from './http';

const MAX_VAULT_MEMBERS = 200;
const MAX_PASSKEYS = 10;
const VAULT_TOKEN_IDLE_MS = 180 * 24 * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const PASSKEY_HOSTS = ['splitsplash.pages.dev'];

export const vault = new Hono<App>();

/** Passkeys are bound to the site the browser is on; only accept known hosts (and localhost for development). */
function relyingParty(c: Context<App>) {
  const origin = c.req.header('origin') ?? '';
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return fail(400, 'passkey_unavailable');
  }
  const local = url.hostname === 'localhost' && (url.protocol === 'http:' || url.protocol === 'https:');
  if (!local && !(url.protocol === 'https:' && PASSKEY_HOSTS.includes(url.hostname))) fail(400, 'passkey_unavailable');
  return { rpID: url.hostname, origin: url.origin };
}

async function newChallenge(db: D1Database, challenge: string, rp: { rpID: string; origin: string }, vaultId: string | null) {
  const id = newId();
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').bind(now),
    db
      .prepare('INSERT INTO webauthn_challenges (id, challenge, vault_id, rp_id, origin, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, challenge, vaultId, rp.rpID, rp.origin, now + CHALLENGE_TTL_MS),
  ]);
  return id;
}

/** Single use: the row is deleted as it is read. */
async function takeChallenge(db: D1Database, id: string, vaultId: string | null) {
  const row = await db
    .prepare('DELETE FROM webauthn_challenges WHERE id = ? RETURNING challenge, vault_id, rp_id, origin, expires_at')
    .bind(id)
    .first<{ challenge: string; vault_id: string | null; rp_id: string; origin: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now() || row.vault_id !== vaultId) fail(400, 'passkey_expired');
  return row!;
}

/** Short public tag, shown in the app and in the password manager, to tell keyrings apart. */
const vaultTag = async (vaultId: string) => (await sha256(`tag:${vaultId}`)).slice(0, 4).toUpperCase();

/** "iPhone · Safari": where a passkey was created, so the list of passkeys is readable. */
function deviceLabel(ua: string) {
  const device = [
    [/iPhone/, 'iPhone'],
    [/iPad/, 'iPad'],
    [/Android/, 'Android'],
    [/CrOS/, 'ChromeOS'],
    [/Mac OS X|Macintosh/, 'Mac'],
    [/Windows/, 'Windows'],
    [/Linux/, 'Linux'],
  ].find(([re]) => (re as RegExp).test(ua))?.[1];
  const browser = [
    [/Edg\//, 'Edge'],
    [/SamsungBrowser/, 'Samsung Internet'],
    [/Firefox\/|FxiOS/, 'Firefox'],
    [/Chrome\/|CriOS/, 'Chrome'],
    [/Safari\//, 'Safari'],
  ].find(([re]) => (re as RegExp).test(ua))?.[1];
  return [device, browser].filter(Boolean).join(' · ').slice(0, 60);
}

async function issueVaultToken(db: D1Database, vaultId: string) {
  const token = randomToken();
  const now = Date.now();
  return {
    token,
    stmt: db
      .prepare('INSERT INTO vault_tokens (token_hash, vault_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
      .bind(await tokenHash(token), vaultId, now, now),
  };
}

/** Members (seats) behind the given device tokens; invalid or expired tokens are skipped. */
async function membersForTokens(db: D1Database, tokens: string[]) {
  const hashes = await Promise.all([...new Set(tokens)].map(tokenHash));
  const rows = await db.batch(hashes.map((h) => db.prepare('SELECT member_id FROM member_tokens WHERE token_hash = ?').bind(h)));
  return [...new Set(rows.flatMap((r) => (r.results as { member_id: string }[]).map((m) => m.member_id)))];
}

async function link(db: D1Database, vaultId: string, memberIds: string[]) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM vault_members WHERE vault_id = ?').bind(vaultId).first<{ n: number }>();
  if ((row?.n ?? 0) + memberIds.length > MAX_VAULT_MEMBERS) fail(409, 'vault_full');
  const now = Date.now();
  if (memberIds.length)
    await db.batch(
      memberIds.map((m) => db.prepare('INSERT OR IGNORE INTO vault_members (vault_id, member_id, created_at) VALUES (?, ?, ?)').bind(vaultId, m, now)),
    );
}

/** Mints device tokens for the linked rooms (all, or only `roomIds`). */
async function roomTokens(db: D1Database, vaultId: string, roomIds?: string[]) {
  const { results } = await db
    .prepare('SELECT m.id, m.room_id, r.name FROM vault_members v JOIN members m ON m.id = v.member_id JOIN rooms r ON r.id = m.room_id WHERE v.vault_id = ?')
    .bind(vaultId)
    .all<{ id: string; room_id: string; name: string }>();
  const wanted = roomIds ? new Set(roomIds) : null;
  const issued = await Promise.all(results.filter((m) => !wanted || wanted.has(m.room_id)).map(async (m) => ({ m, ...(await issueToken(db, m.id, vaultId)) })));
  return { stmts: issued.map((i) => i.stmt), rooms: issued.map(({ m, token }) => ({ roomId: m.room_id, name: m.name, token })) };
}

/** Signs this device into the keyring and into every linked room. */
async function open(db: D1Database, vaultId: string) {
  const { stmts, rooms } = await roomTokens(db, vaultId);
  const vt = await issueVaultToken(db, vaultId);
  await db.batch([vt.stmt, ...stmts]);
  return { vaultToken: vt.token, rooms };
}

// ---------- public ----------

vault.post('/', async (c) => {
  const { tokens } = await body(c, vaultCreateInput);
  await rateLimit(c);
  const db = c.env.DB;
  const members = await membersForTokens(db, tokens);
  if (!members.length) fail(400, 'no_rooms');
  const vaultId = newId();
  const recoveryCode = generateRecoveryCode();
  const vt = await issueVaultToken(db, vaultId);
  await db.batch([
    db.prepare('INSERT INTO vaults (id, recovery_hash, created_at) VALUES (?, ?, ?)').bind(vaultId, await recoveryHash(recoveryCode, pepper(c)), Date.now()),
    vt.stmt,
  ]);
  await link(db, vaultId, members);
  return c.json({ vaultToken: vt.token, recoveryCode }, 201);
});

vault.post('/recover', async (c) => {
  const { code } = await body(c, vaultRecoverInput);
  await rateLimit(c);
  const db = c.env.DB;
  const keys = await guardFailures(c);
  const row = isRecoveryShape(code)
    ? await db
        .prepare('SELECT id FROM vaults WHERE recovery_hash = ?')
        .bind(await recoveryHash(normalizePassphrase(code), pepper(c)))
        .first<{ id: string }>()
    : null;
  if (!row) {
    await recordFailure(db, keys);
    fail(404, 'vault_not_found');
  }
  return c.json(await open(db, row!.id));
});

vault.post('/passkey/login/options', async (c) => {
  await rateLimit(c);
  const rp = relyingParty(c);
  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: 'required' });
  return c.json({ challengeId: await newChallenge(c.env.DB, options.challenge, rp, null), options });
});

vault.post('/passkey/login', async (c) => {
  const input = await body(c, passkeyVerifyInput);
  await rateLimit(c);
  const db = c.env.DB;
  const ch = await takeChallenge(db, input.challengeId, null);
  const pk = await db
    .prepare('SELECT credential_id, vault_id, public_key, counter, transports FROM passkeys WHERE credential_id = ?')
    .bind(input.response.id)
    .first<{ credential_id: string; vault_id: string; public_key: string; counter: number; transports: string }>();
  if (!pk) fail(404, 'passkey_unknown');
  let newCounter: number;
  try {
    const v = await verifyAuthenticationResponse({
      response: input.response as unknown as AuthenticationResponseJSON,
      expectedChallenge: ch.challenge,
      expectedOrigin: ch.origin,
      expectedRPID: ch.rp_id,
      credential: { id: pk!.credential_id, publicKey: fromB64Url(pk!.public_key), counter: pk!.counter, transports: JSON.parse(pk!.transports) },
    });
    if (!v.verified) throw new Error('not verified');
    newCounter = v.authenticationInfo.newCounter;
  } catch {
    return fail(401, 'passkey_invalid');
  }
  await db.prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ?').bind(newCounter, Date.now(), pk!.credential_id).run();
  return c.json(await open(db, pk!.vault_id));
});

// ---------- authenticated (bearer keyring token) ----------

const authed = new Hono<App>();

authed.use(async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) fail(401, 'unauthorized');
  const hash = await tokenHash(token!);
  const row = await c.env.DB.prepare('SELECT vault_id, last_seen_at FROM vault_tokens WHERE token_hash = ?')
    .bind(hash)
    .first<{ vault_id: string; last_seen_at: number }>();
  if (!row) fail(401, 'unauthorized');
  if (Date.now() - row!.last_seen_at > VAULT_TOKEN_IDLE_MS) {
    await c.env.DB.prepare('DELETE FROM vault_tokens WHERE token_hash = ?').bind(hash).run();
    fail(401, 'unauthorized');
  }
  c.set('vault', { vaultId: row!.vault_id, tokenHash: hash });
  if (Date.now() - row!.last_seen_at > 60 * 60 * 1000) {
    c.executionCtx.waitUntil(c.env.DB.prepare('UPDATE vault_tokens SET last_seen_at = ? WHERE token_hash = ?').bind(Date.now(), hash).run());
  }
  if (c.req.method !== 'GET') await limitWrites(c, { vaultId: row!.vault_id });
  await next();
});

authed.get('/', async (c) => {
  const { vaultId } = c.get('vault');
  const db = c.env.DB;
  const [rooms, keys, v] = await db.batch([
    db
      .prepare(
        `SELECT r.id AS room_id, r.name AS room_name, m.name, m.animal, m.ink FROM vault_members v
         JOIN members m ON m.id = v.member_id JOIN rooms r ON r.id = m.room_id WHERE v.vault_id = ? ORDER BY v.created_at DESC`,
      )
      .bind(vaultId),
    db.prepare('SELECT credential_id, label, created_at, last_used_at FROM passkeys WHERE vault_id = ? ORDER BY created_at').bind(vaultId),
    db.prepare('SELECT created_at FROM vaults WHERE id = ?').bind(vaultId),
  ]);
  const r = rooms.results as { room_id: string; room_name: string; name: string; animal: string; ink: number }[];
  const k = keys.results as { credential_id: string; label: string; created_at: number; last_used_at: number }[];
  return c.json({
    tag: await vaultTag(vaultId),
    rooms: r.map((x) => ({ roomId: x.room_id, roomName: x.room_name, member: { name: x.name, animal: x.animal, ink: x.ink } })),
    passkeys: k.map((p) => ({ id: p.credential_id, label: p.label, createdAt: p.created_at, lastUsedAt: p.last_used_at })),
    createdAt: (v.results[0] as { created_at: number }).created_at,
  });
});

authed.post('/rooms', async (c) => {
  const { tokens } = await body(c, vaultLinkInput);
  const db = c.env.DB;
  await link(db, c.get('vault').vaultId, await membersForTokens(db, tokens));
  return c.json({ ok: true });
});

/** Brings linked rooms back onto this device without a new passkey prompt. */
authed.post('/open', async (c) => {
  const { roomIds } = await body(c, vaultOpenInput);
  const db = c.env.DB;
  const { stmts, rooms } = await roomTokens(db, c.get('vault').vaultId, roomIds);
  if (stmts.length) await db.batch(stmts);
  return c.json({ rooms });
});

authed.delete('/rooms/:roomId', async (c) => {
  await c.env.DB.prepare('DELETE FROM vault_members WHERE vault_id = ? AND member_id IN (SELECT id FROM members WHERE room_id = ?)')
    .bind(c.get('vault').vaultId, c.req.param('roomId'))
    .run();
  return c.json({ ok: true });
});

authed.post('/passkey/register/options', async (c) => {
  const { vaultId } = c.get('vault');
  const rp = relyingParty(c);
  const db = c.env.DB;
  const { results } = await db
    .prepare('SELECT credential_id, transports FROM passkeys WHERE vault_id = ?')
    .bind(vaultId)
    .all<{ credential_id: string; transports: string }>();
  if (results.length >= MAX_PASSKEYS) fail(409, 'too_many_passkeys');
  const name = `SplitSplash · ${await vaultTag(vaultId)}`;
  const options = await generateRegistrationOptions({
    rpName: 'SplitSplash',
    rpID: rp.rpID,
    userID: new Uint8Array(new TextEncoder().encode(vaultId)),
    userName: name,
    userDisplayName: name,
    attestationType: 'none',
    excludeCredentials: results.map((p) => ({ id: p.credential_id, transports: JSON.parse(p.transports) })),
    // The keyring opens every linked room, so a bare touch isn't enough: require the device's PIN, face or fingerprint.
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  return c.json({ challengeId: await newChallenge(db, options.challenge, rp, vaultId), options });
});

authed.post('/passkey/register', async (c) => {
  const input = await body(c, passkeyVerifyInput);
  const { vaultId } = c.get('vault');
  const db = c.env.DB;
  const ch = await takeChallenge(db, input.challengeId, vaultId);
  let cred;
  try {
    const v = await verifyRegistrationResponse({
      response: input.response as unknown as RegistrationResponseJSON,
      expectedChallenge: ch.challenge,
      expectedOrigin: ch.origin,
      expectedRPID: ch.rp_id,
    });
    if (!v.verified) throw new Error('not verified');
    cred = v.registrationInfo.credential;
  } catch {
    return fail(400, 'passkey_invalid');
  }
  const now = Date.now();
  await db
    .prepare(
      'INSERT OR IGNORE INTO passkeys (credential_id, vault_id, public_key, counter, transports, created_at, last_used_at, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      cred.id,
      vaultId,
      toB64Url(cred.publicKey),
      cred.counter,
      JSON.stringify(cred.transports ?? []),
      now,
      now,
      deviceLabel(c.req.header('user-agent') ?? ''),
    )
    .run();
  return c.json({ ok: true }, 201);
});

authed.delete('/passkeys/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM passkeys WHERE credential_id = ? AND vault_id = ?').bind(c.req.param('id'), c.get('vault').vaultId).run();
  return c.json({ ok: true });
});

/**
 * For a leaked code: replaces it and signs out every other device that entered through this keyring,
 * both from the keyring and from the rooms it opened. Tokens in `keep` (this device's rooms) survive.
 */
authed.post('/recovery-code', async (c) => {
  const { keep } = await body(c, vaultNewCodeInput);
  const { vaultId, tokenHash: own } = c.get('vault');
  const db = c.env.DB;
  const kept = await Promise.all(keep.map(tokenHash));
  const recoveryCode = generateRecoveryCode();
  await db.batch([
    db.prepare('UPDATE vaults SET recovery_hash = ? WHERE id = ?').bind(await recoveryHash(recoveryCode, pepper(c)), vaultId),
    db.prepare('DELETE FROM vault_tokens WHERE vault_id = ? AND token_hash != ?').bind(vaultId, own),
    db
      .prepare(`DELETE FROM member_tokens WHERE vault_id = ?${kept.length ? ` AND token_hash NOT IN (${kept.map(() => '?').join(', ')})` : ''}`)
      .bind(vaultId, ...kept),
  ]);
  return c.json({ recoveryCode });
});

authed.post('/signout', async (c) => {
  await c.env.DB.prepare('DELETE FROM vault_tokens WHERE token_hash = ?').bind(c.get('vault').tokenHash).run();
  return c.json({ ok: true });
});

authed.delete('/', async (c) => {
  await c.env.DB.prepare('DELETE FROM vaults WHERE id = ?').bind(c.get('vault').vaultId).run();
  return c.json({ ok: true });
});

vault.route('/', authed);
