-- migrations/create_jobs.sql
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  result_path TEXT,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
