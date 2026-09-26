CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  submitted_at TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bug', 'suggestion', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT NOT NULL,
  expected TEXT NOT NULL,
  diagnostics_json TEXT,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'investigating', 'resolved', 'spam')),
  resolution_note TEXT NOT NULL DEFAULT '',
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS feedback_submitted ON feedback(submitted_at);
CREATE INDEX IF NOT EXISTS feedback_status ON feedback(status, submitted_at);
