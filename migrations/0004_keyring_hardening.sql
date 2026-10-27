-- Member tokens minted by a keyring, so it can revoke them if its recovery code leaks.
ALTER TABLE member_tokens ADD COLUMN vault_id TEXT;
CREATE INDEX idx_tokens_vault ON member_tokens(vault_id);
-- Where each passkey was created ("iPhone · Safari"), to tell them apart.
ALTER TABLE passkeys ADD COLUMN label TEXT NOT NULL DEFAULT '';
