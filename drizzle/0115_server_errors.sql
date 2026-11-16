CREATE TABLE IF NOT EXISTS server_errors (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  created TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_server_errors_created ON server_errors(created);
