CREATE TABLE IF NOT EXISTS installations (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
  state_json TEXT, enabled INTEGER NOT NULL DEFAULT 0, next_at INTEGER,
  updated_at INTEGER NOT NULL, last_day TEXT, last_status TEXT,
  last_test_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS reminders_due ON installations(enabled, next_at);
CREATE INDEX IF NOT EXISTS reminders_expiry ON installations(updated_at);
CREATE TABLE IF NOT EXISTS deliveries (
  installation_id TEXT NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  local_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0,
  retry_at INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
  PRIMARY KEY (installation_id, local_date)
);
CREATE INDEX IF NOT EXISTS delivery_expiry ON deliveries(created_at);
CREATE TABLE IF NOT EXISTS scheduler_health (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  scheduled_at INTEGER NOT NULL, started_at INTEGER NOT NULL,
  completed_at INTEGER, status TEXT NOT NULL CHECK(status IN ('running', 'ok', 'failed'))
);
