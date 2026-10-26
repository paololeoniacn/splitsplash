-- Optional keyring ("portachiavi"): links a device-independent identity to member seats, unlocked by passkey or recovery code.
CREATE TABLE vaults (
  id TEXT PRIMARY KEY,
  recovery_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE passkeys (
  credential_id TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL,
  transports TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
);
CREATE INDEX idx_passkeys_vault ON passkeys(vault_id);

CREATE TABLE vault_members (
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (vault_id, member_id)
);
CREATE INDEX idx_vault_members_member ON vault_members(member_id);

CREATE TABLE vault_tokens (
  token_hash TEXT PRIMARY KEY,
  vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX idx_vault_tokens_vault ON vault_tokens(vault_id);

CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY,
  challenge TEXT NOT NULL,
  vault_id TEXT REFERENCES vaults(id) ON DELETE CASCADE,
  rp_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
