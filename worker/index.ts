import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { INK_COUNT } from '../shared/animals';
import { generatePassphrase, normalizePassphrase } from '../shared/passphrase';
import { computeBalances, simplifyDebts, type Transfer } from '../shared/balances';
import { createRoomInput, expenseInput, joinInput, lookupInput, memberInput, rotateInput, settleAllInput } from '../shared/schemas';
import { SplitError, splitExpense } from '../shared/split';
import type { Activity, ActivityType, Expense, Member, Room, RoomState } from '../shared/types';
import { decrypt, encrypt, newId, passphraseHash, tokenHash } from './crypto';
import { body, fail, guardFailures, issueToken, pepper, rateLimit, recordFailure, type App } from './http';

const app = new Hono<App>().basePath('/api');

const MAX_MEMBERS = 50;
const MAX_EXPENSES = 5000;
const TOKEN_IDLE_MS = 90 * 24 * 60 * 60 * 1000;

app.use(async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
});

async function logActivity(db: D1Database, roomId: string, memberId: string | null, type: ActivityType, payload: Record<string, unknown> = {}) {
  return db
    .prepare('INSERT INTO activity (id, room_id, member_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId(), roomId, memberId, type, JSON.stringify(payload), Date.now());
}

async function roomByPassphrase(c: Context<App>, passphrase: string) {
  const db = c.env.DB;
  const keys = await guardFailures(c);
  const hash = await passphraseHash(normalizePassphrase(passphrase), pepper(c));
  const room = await db
    .prepare('SELECT id, name, currency, created_at FROM rooms WHERE passphrase_hash = ?')
    .bind(hash)
    .first<{ id: string; name: string; currency: string; created_at: number }>();
  if (room) return room;
  await recordFailure(db, keys);
  return fail(404, 'room_not_found');
}

async function listMembers(db: D1Database, roomId: string): Promise<Member[]> {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.name, m.animal, m.ink, m.created_at,
        EXISTS (SELECT 1 FROM member_tokens t WHERE t.member_id = m.id) AS claimed
       FROM members m WHERE m.room_id = ? ORDER BY m.created_at, m.id`,
    )
    .bind(roomId)
    .all<{ id: string; name: string; animal: string; ink: number; created_at: number; claimed: number }>();
  return results.map((m) => ({ id: m.id, name: m.name, animal: m.animal, ink: m.ink, claimed: !!m.claimed, createdAt: m.created_at }));
}

async function ensureRoomHasSpace(db: D1Database, roomId: string) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM members WHERE room_id = ?').bind(roomId).first<{ n: number }>();
  if ((row?.n ?? 0) >= MAX_MEMBERS) fail(409, 'room_full');
}

async function nextInk(db: D1Database, roomId: string) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM members WHERE room_id = ?').bind(roomId).first<{ n: number }>();
  return (row?.n ?? 0) % INK_COUNT;
}

// ---------- public ----------

app.post('/rooms', async (c) => {
  const input = await body(c, createRoomInput);
  await rateLimit(c);
  const db = c.env.DB;
  const now = Date.now();
  const roomId = newId();
  const memberId = newId();
  const passphrase = generatePassphrase();
  const { token, stmt } = await issueToken(db, memberId);
  await db.batch([
    db
      .prepare('INSERT INTO rooms (id, name, currency, passphrase_hash, passphrase_enc, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(roomId, input.name, input.currency, await passphraseHash(passphrase, pepper(c)), await encrypt(passphrase, pepper(c)), now),
    db
      .prepare('INSERT INTO members (id, room_id, name, animal, ink, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .bind(memberId, roomId, input.member.name, input.member.animal, now),
    stmt,
    await logActivity(db, roomId, memberId, 'room_created', { name: input.name }),
  ]);
  return c.json({ roomId, token, passphrase }, 201);
});

app.post('/join/lookup', async (c) => {
  const { passphrase } = await body(c, lookupInput);
  await rateLimit(c);
  const room = await roomByPassphrase(c, passphrase);
  return c.json({ room: { id: room.id, name: room.name, currency: room.currency }, members: await listMembers(c.env.DB, room.id) });
});

app.post('/join', async (c) => {
  const input = await body(c, joinInput);
  await rateLimit(c);
  const db = c.env.DB;
  const room = await roomByPassphrase(c, input.passphrase);
  if ('memberId' in input) {
    const m = await db.prepare('SELECT id, name FROM members WHERE id = ? AND room_id = ?').bind(input.memberId, room.id).first<{ id: string; name: string }>();
    if (!m) fail(404, 'member_not_found');
    const { token, stmt } = await issueToken(db, m!.id);
    await db.batch([stmt, await logActivity(db, room.id, m!.id, 'member_claimed', { name: m!.name })]);
    return c.json({ roomId: room.id, token });
  }
  await ensureRoomHasSpace(db, room.id);
  const memberId = newId();
  const { token, stmt } = await issueToken(db, memberId);
  await db.batch([
    db
      .prepare('INSERT INTO members (id, room_id, name, animal, ink, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(memberId, room.id, input.member.name, input.member.animal, await nextInk(db, room.id), Date.now()),
    stmt,
    await logActivity(db, room.id, memberId, 'member_joined', { name: input.member.name, animal: input.member.animal }),
  ]);
  return c.json({ roomId: room.id, token }, 201);
});

// ---------- authenticated (bearer member token) ----------

const room = new Hono<App>();

room.use(async (c, next) => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) fail(401, 'unauthorized');
  const hash = await tokenHash(token!);
  const row = await c.env.DB.prepare(
    'SELECT t.member_id, m.room_id, t.last_seen_at FROM member_tokens t JOIN members m ON m.id = t.member_id WHERE t.token_hash = ?',
  )
    .bind(hash)
    .first<{ member_id: string; room_id: string; last_seen_at: number }>();
  if (!row) fail(401, 'unauthorized');
  if (Date.now() - row!.last_seen_at > TOKEN_IDLE_MS) {
    await c.env.DB.prepare('DELETE FROM member_tokens WHERE token_hash = ?').bind(hash).run();
    fail(401, 'unauthorized');
  }
  c.set('auth', { memberId: row!.member_id, roomId: row!.room_id, tokenHash: hash });
  if (Date.now() - row!.last_seen_at > 60 * 60 * 1000) {
    c.executionCtx.waitUntil(c.env.DB.prepare('UPDATE member_tokens SET last_seen_at = ? WHERE token_hash = ?').bind(Date.now(), hash).run());
  }
  await next();
});

room.get('/', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const r = await c.env.DB.prepare('SELECT id, name, currency, passphrase_enc, created_at FROM rooms WHERE id = ?')
    .bind(roomId)
    .first<{ id: string; name: string; currency: string; passphrase_enc: string; created_at: number }>();
  if (!r) fail(404, 'room_not_found');
  const state: RoomState = {
    room: { id: r!.id, name: r!.name, currency: r!.currency, createdAt: r!.created_at } satisfies Room,
    members: await listMembers(c.env.DB, roomId),
    me: memberId,
    passphrase: await decrypt(r!.passphrase_enc, pepper(c)),
  };
  return c.json(state);
});

room.post('/passphrase', async (c) => {
  const { roomId, memberId, tokenHash: own } = c.get('auth');
  // Older cached clients send no body; treat that as "keep other devices signed in".
  const parsed = rotateInput.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) fail(400, 'invalid_input');
  const signOutOthers = parsed.data!.signOutOthers ?? false;
  const db = c.env.DB;
  const passphrase = generatePassphrase();
  await db.batch([
    db
      .prepare('UPDATE rooms SET passphrase_hash = ?, passphrase_enc = ? WHERE id = ?')
      .bind(await passphraseHash(passphrase, pepper(c)), await encrypt(passphrase, pepper(c)), roomId),
    ...(signOutOthers
      ? [db.prepare('DELETE FROM member_tokens WHERE token_hash != ? AND member_id IN (SELECT id FROM members WHERE room_id = ?)').bind(own, roomId)]
      : []),
    await logActivity(db, roomId, memberId, 'passphrase_rotated', { signedOutOthers: signOutOthers }),
  ]);
  return c.json({ passphrase });
});

room.post('/members', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const input = await body(c, memberInput);
  const db = c.env.DB;
  await ensureRoomHasSpace(db, roomId);
  const id = newId();
  await db.batch([
    db
      .prepare('INSERT INTO members (id, room_id, name, animal, ink, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, roomId, input.name, input.animal, await nextInk(db, roomId), Date.now()),
    await logActivity(db, roomId, memberId, 'member_added', { name: input.name, animal: input.animal }),
  ]);
  return c.json({ id }, 201);
});

room.patch('/me', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const input = await body(c, memberInput);
  const db = c.env.DB;
  await db.batch([
    db.prepare('UPDATE members SET name = ?, animal = ? WHERE id = ?').bind(input.name, input.animal, memberId),
    await logActivity(db, roomId, memberId, 'member_updated', { name: input.name, animal: input.animal }),
  ]);
  return c.json({ ok: true });
});

room.post('/leave', async (c) => {
  await c.env.DB.prepare('DELETE FROM member_tokens WHERE token_hash = ?').bind(c.get('auth').tokenHash).run();
  return c.json({ ok: true });
});

room.get('/expenses', async (c) => {
  const { roomId } = c.get('auth');
  const db = c.env.DB;
  const [exp, splits] = await db.batch([
    db.prepare('SELECT * FROM expenses WHERE room_id = ? AND deleted_at IS NULL ORDER BY date DESC, created_at DESC').bind(roomId),
    db
      .prepare(
        'SELECT s.expense_id, s.member_id, s.value, s.amount FROM expense_splits s JOIN expenses e ON e.id = s.expense_id WHERE e.room_id = ? AND e.deleted_at IS NULL',
      )
      .bind(roomId),
  ]);
  const byExpense = new Map<string, Expense['splits']>();
  for (const s of splits.results as { expense_id: string; member_id: string; value: number; amount: number }[]) {
    const list = byExpense.get(s.expense_id) ?? [];
    list.push({ memberId: s.member_id, value: s.value, amount: s.amount });
    byExpense.set(s.expense_id, list);
  }
  const expenses: Expense[] = (exp.results as Record<string, never>[]).map((e) => ({
    id: e.id,
    kind: e.kind,
    title: e.title,
    note: e.note,
    category: e.category,
    amount: e.amount,
    paidBy: e.paid_by,
    date: e.date,
    splitMode: e.split_mode,
    splits: byExpense.get(e.id) ?? [],
    createdBy: e.created_by,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }));
  return c.json({ expenses });
});

async function validatedExpense(c: Context<App>) {
  const { roomId } = c.get('auth');
  const input = await body(c, expenseInput);
  const memberIds = new Set((await listMembers(c.env.DB, roomId)).map((m) => m.id));
  if (!memberIds.has(input.paidBy) || input.split.entries.some((e) => !memberIds.has(e.memberId))) fail(400, 'unknown_member');
  if (input.kind === 'transfer' && (input.split.entries.length !== 1 || input.split.entries[0].memberId === input.paidBy)) fail(400, 'invalid_transfer');
  try {
    const mode = input.kind === 'transfer' ? 'equal' : input.split.mode;
    return { input: { ...input, split: { ...input.split, mode } }, allocations: splitExpense(input.amount, mode, input.split.entries) };
  } catch (err) {
    if (err instanceof SplitError) fail(400, err.code);
    throw err;
  }
}

const splitInserts = (db: D1Database, expenseId: string, allocations: ReturnType<typeof splitExpense>) =>
  allocations.map((a) =>
    db.prepare('INSERT INTO expense_splits (expense_id, member_id, value, amount) VALUES (?, ?, ?, ?)').bind(expenseId, a.memberId, a.value, a.amount),
  );

room.post('/expenses', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const { input, allocations } = await validatedExpense(c);
  const db = c.env.DB;
  const count = await db.prepare('SELECT COUNT(*) AS n FROM expenses WHERE room_id = ?').bind(roomId).first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_EXPENSES) fail(409, 'too_many_expenses');
  const id = newId();
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        'INSERT INTO expenses (id, room_id, kind, title, note, category, amount, paid_by, split_mode, date, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(id, roomId, input.kind, input.title, input.note, input.category, input.amount, input.paidBy, input.split.mode, input.date, memberId, now, now),
    ...splitInserts(db, id, allocations),
    await logActivity(db, roomId, memberId, 'expense_added', {
      expenseId: id,
      kind: input.kind,
      title: input.title,
      amount: input.amount,
      paidBy: input.paidBy,
      to: input.kind === 'transfer' ? input.split.entries[0].memberId : undefined,
    }),
  ]);
  return c.json({ id }, 201);
});

const planKey = (list: Transfer[]) =>
  list
    .map((x) => `${x.from}>${x.to}:${x.amount}`)
    .sort()
    .join('|');

/** Records every suggested reimbursement at once, so all balances go back to zero. */
room.post('/settle-all', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const input = await body(c, settleAllInput);
  const db = c.env.DB;
  const [members, splits, count] = await db.batch([
    db.prepare('SELECT id FROM members WHERE room_id = ?').bind(roomId),
    db
      .prepare(
        'SELECT e.id, e.kind, e.amount, e.paid_by, s.member_id, s.amount AS share FROM expenses e JOIN expense_splits s ON s.expense_id = e.id WHERE e.room_id = ? AND e.deleted_at IS NULL',
      )
      .bind(roomId),
    db.prepare('SELECT COUNT(*) AS n FROM expenses WHERE room_id = ?').bind(roomId),
  ]);
  const items = new Map<string, { kind: 'expense' | 'transfer'; amount: number; paidBy: string; splits: { memberId: string; amount: number }[] }>();
  for (const r of splits.results as { id: string; kind: 'expense' | 'transfer'; amount: number; paid_by: string; member_id: string; share: number }[]) {
    const item = items.get(r.id) ?? { kind: r.kind, amount: r.amount, paidBy: r.paid_by, splits: [] };
    item.splits.push({ memberId: r.member_id, amount: r.share });
    items.set(r.id, item);
  }
  const plan = simplifyDebts(
    computeBalances(
      (members.results as { id: string }[]).map((m) => m.id),
      [...items.values()],
    ),
  );
  if (!plan.length) fail(409, 'nothing_to_settle');
  if (planKey(plan) !== planKey(input.transfers)) fail(409, 'balances_changed');
  if (((count.results[0] as { n: number } | undefined)?.n ?? 0) + plan.length > MAX_EXPENSES) fail(409, 'too_many_expenses');

  const now = Date.now();
  const stmts = plan.flatMap((x) => {
    const id = newId();
    return [
      db
        .prepare(
          'INSERT INTO expenses (id, room_id, kind, title, note, category, amount, paid_by, split_mode, date, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(id, roomId, 'transfer', input.title, '', 'other', x.amount, x.from, 'equal', input.date, memberId, now, now),
      db.prepare('INSERT INTO expense_splits (expense_id, member_id, value, amount) VALUES (?, ?, ?, ?)').bind(id, x.to, 1, x.amount),
    ];
  });
  const total = plan.reduce((s, x) => s + x.amount, 0);
  await db.batch([...stmts, await logActivity(db, roomId, memberId, 'settled_all', { count: plan.length, amount: total })]);
  return c.json({ count: plan.length, amount: total }, 201);
});

async function ownedExpense(c: Context<App>) {
  const { roomId } = c.get('auth');
  const id = c.req.param('id')!;
  const row = await c.env.DB.prepare('SELECT id, title, amount, kind FROM expenses WHERE id = ? AND room_id = ? AND deleted_at IS NULL')
    .bind(id, roomId)
    .first<{ id: string; title: string; amount: number; kind: string }>();
  return row ?? fail(404, 'expense_not_found');
}

room.put('/expenses/:id', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const existing = await ownedExpense(c);
  const { input, allocations } = await validatedExpense(c);
  const db = c.env.DB;
  await db.batch([
    db
      .prepare(
        'UPDATE expenses SET kind = ?, title = ?, note = ?, category = ?, amount = ?, paid_by = ?, split_mode = ?, date = ?, updated_at = ? WHERE id = ?',
      )
      .bind(input.kind, input.title, input.note, input.category, input.amount, input.paidBy, input.split.mode, input.date, Date.now(), existing.id),
    db.prepare('DELETE FROM expense_splits WHERE expense_id = ?').bind(existing.id),
    ...splitInserts(db, existing.id, allocations),
    await logActivity(db, roomId, memberId, 'expense_updated', {
      expenseId: existing.id,
      title: input.title,
      amount: input.amount,
      previousAmount: existing.amount,
    }),
  ]);
  return c.json({ ok: true });
});

room.delete('/expenses/:id', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const existing = await ownedExpense(c);
  const db = c.env.DB;
  await db.batch([
    db.prepare('UPDATE expenses SET deleted_at = ? WHERE id = ?').bind(Date.now(), existing.id),
    await logActivity(db, roomId, memberId, 'expense_deleted', { expenseId: existing.id, title: existing.title, amount: existing.amount, kind: existing.kind }),
  ]);
  return c.json({ ok: true });
});

room.post('/expenses/:id/restore', async (c) => {
  const { roomId, memberId } = c.get('auth');
  const id = c.req.param('id');
  const db = c.env.DB;
  const row = await db
    .prepare('SELECT id, title, amount FROM expenses WHERE id = ? AND room_id = ? AND deleted_at IS NOT NULL')
    .bind(id, roomId)
    .first<{ id: string; title: string; amount: number }>();
  if (!row) fail(404, 'expense_not_found');
  await db.batch([
    db.prepare('UPDATE expenses SET deleted_at = NULL WHERE id = ?').bind(id),
    await logActivity(db, roomId, memberId, 'expense_added', { expenseId: id, title: row!.title, amount: row!.amount, restored: true }),
  ]);
  return c.json({ ok: true });
});

room.get('/activity', async (c) => {
  const { roomId } = c.get('auth');
  const before = Number(c.req.query('before')) || Number.MAX_SAFE_INTEGER;
  const { results } = await c.env.DB.prepare(
    'SELECT id, member_id, type, payload, created_at FROM activity WHERE room_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 50',
  )
    .bind(roomId, before)
    .all<{ id: string; member_id: string | null; type: Activity['type']; payload: string; created_at: number }>();
  const activity: Activity[] = results.map((a) => ({ id: a.id, memberId: a.member_id, type: a.type, payload: JSON.parse(a.payload), createdAt: a.created_at }));
  return c.json({ activity, hasMore: results.length === 50 });
});

app.route('/room', room);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: 'server_error' }, 500);
});

export default app;
