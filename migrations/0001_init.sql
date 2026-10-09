CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  passphrase_hash TEXT NOT NULL UNIQUE,
  passphrase_enc TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE members (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  animal TEXT NOT NULL,
  ink INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_members_room ON members(room_id);

CREATE TABLE member_tokens (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX idx_tokens_member ON member_tokens(member_id);

CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'transfer')),
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  paid_by TEXT NOT NULL REFERENCES members(id),
  split_mode TEXT NOT NULL,
  date TEXT NOT NULL,
  created_by TEXT REFERENCES members(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_expenses_room_date ON expenses(room_id, deleted_at, date DESC, created_at DESC);

CREATE TABLE expense_splits (
  expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id),
  value REAL NOT NULL,
  amount INTEGER NOT NULL,
  PRIMARY KEY (expense_id, member_id)
);

CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_activity_room ON activity(room_id, created_at DESC);
