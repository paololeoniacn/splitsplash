import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';
import { networkKeys } from './net';
import { randomToken, sha256, tokenHash } from './crypto';

export type Auth = { memberId: string; roomId: string; tokenHash: string };
export type VaultAuth = { vaultId: string; tokenHash: string };
export type App = { Bindings: Env; Variables: { auth: Auth; vault: VaultAuth } };

// Wrong secrets (passphrases, recovery codes) allowed per hour, per address and per wider network, before guesses are refused.
const FAILURE_WINDOW_MS = 60 * 60 * 1000;
// The wider bucket is generous: mobile carriers put many unrelated people behind one IPv4 /24.
const MAX_FAILURES = { host: 12, wide: 60 } as const;
// Changes per room (or keyring) per day; far above any real group, low enough that one member can't exhaust the shared database.
const MAX_DAILY_WRITES = 500;

export const fail = (status: 400 | 401 | 403 | 404 | 409 | 429 | 500, code: string): never => {
  throw new HTTPException(status, { res: Response.json({ error: code }, { status }) });
};

export async function body<T extends z.ZodType>(c: Context<App>, schema: T): Promise<z.infer<T>> {
  const raw = await c.req.json().catch(() => fail(400, 'invalid_json'));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) fail(400, 'invalid_input');
  return parsed.data as z.infer<T>;
}

export async function rateLimit(c: Context<App>) {
  const { host, wide } = networkKeys(c.req.header('cf-connecting-ip') ?? 'local');
  const checks: [RateLimit | undefined, string][] = [
    [c.env.JOIN_LIMITER, host],
    [c.env.NETWORK_LIMITER, wide],
    [c.env.GLOBAL_LIMITER, 'global'],
  ];
  for (const [limiter, key] of checks) {
    if (limiter && !(await limiter.limit({ key })).success) fail(429, 'rate_limited');
  }
}

export const pepper = (c: Context<App>) => c.env.PEPPER || fail(500, 'server_misconfigured');

/** `vaultId` marks tokens minted by a keyring, so the keyring can revoke them later. */
export async function issueToken(db: D1Database, memberId: string, vaultId: string | null = null) {
  const token = randomToken();
  const now = Date.now();
  return {
    token,
    stmt: db
      .prepare('INSERT INTO member_tokens (token_hash, member_id, created_at, last_seen_at, vault_id) VALUES (?, ?, ?, ?, ?)')
      .bind(await tokenHash(token), memberId, now, now, vaultId),
  };
}

/** Caps write bursts per room or keyring; for rooms also caps the day's total, counted from the activity log. */
export async function limitWrites(c: Context<App>, scope: { roomId: string } | { vaultId: string }) {
  const key = 'roomId' in scope ? `room:${scope.roomId}` : `vault:${scope.vaultId}`;
  if (c.env.WRITE_LIMITER && !(await c.env.WRITE_LIMITER.limit({ key })).success) fail(429, 'rate_limited');
  if ('roomId' in scope) {
    const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM activity WHERE room_id = ? AND created_at > ?')
      .bind(scope.roomId, Date.now() - 24 * 60 * 60 * 1000)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= MAX_DAILY_WRITES) fail(429, 'too_many_writes');
  }
}

type FailureKey = { key: string; bucket: number; max: number };

/** Refuses with 429 once this network has guessed wrong too often; returns the keys to charge on a miss. */
export async function guardFailures(c: Context<App>): Promise<FailureKey[]> {
  const { host, wide } = networkKeys(c.req.header('cf-connecting-ip') ?? 'local');
  const bucket = Math.floor(Date.now() / FAILURE_WINDOW_MS);
  // Hashed so the table never holds addresses.
  const keys = [
    { key: await sha256(`fail:${pepper(c)}:host:${host}`), bucket, max: MAX_FAILURES.host },
    { key: await sha256(`fail:${pepper(c)}:wide:${wide}`), bucket, max: MAX_FAILURES.wide },
  ];
  const db = c.env.DB;
  const counts = await db.batch(keys.map((k) => db.prepare('SELECT count FROM join_failures WHERE key = ? AND bucket = ?').bind(k.key, k.bucket)));
  if (keys.some((k, i) => ((counts[i].results[0] as { count: number } | undefined)?.count ?? 0) >= k.max)) fail(429, 'too_many_failures');
  return keys;
}

export async function recordFailure(db: D1Database, keys: FailureKey[]) {
  await db.batch([
    ...keys.map((k) =>
      db
        .prepare('INSERT INTO join_failures (key, bucket, count) VALUES (?, ?, 1) ON CONFLICT (key, bucket) DO UPDATE SET count = count + 1')
        .bind(k.key, k.bucket),
    ),
    db.prepare('DELETE FROM join_failures WHERE bucket < ?').bind(keys[0].bucket - 1),
  ]);
}
