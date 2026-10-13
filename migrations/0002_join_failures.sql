-- Wrong-passphrase counters per hashed network and hour, for brute-force lockout.
CREATE TABLE join_failures (
  key TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, bucket)
);
