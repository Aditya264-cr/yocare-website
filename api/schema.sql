PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK(length(country_code) = 2),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown' CHECK(source_type IN ('hls','dash','direct','unknown')),
  priority INTEGER NOT NULL DEFAULT 100,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  last_checked_at TEXT,
  last_ok_at TEXT,
  last_status INTEGER,
  last_latency_ms INTEGER,
  latency_ms INTEGER,
  reliability_score INTEGER NOT NULL DEFAULT 50 CHECK(reliability_score BETWEEN 0 AND 100),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  authorization_reference TEXT,
  rights_regions TEXT NOT NULL DEFAULT '[]',
  rights_expires_at TEXT,
  rights_verified_at TEXT,
  last_probe_depth TEXT,
  last_probe_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sources_channel_enabled_priority ON sources(channel_id, enabled, priority);
CREATE INDEX IF NOT EXISTS idx_sources_health ON sources(enabled, last_checked_at, last_ok_at);
CREATE INDEX IF NOT EXISTS idx_sources_latency ON sources(channel_id, latency_ms, reliability_score);
CREATE INDEX IF NOT EXISTS idx_sources_authorization ON sources(enabled, rights_verified_at, rights_expires_at);

CREATE TABLE IF NOT EXISTS source_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  ok INTEGER NOT NULL CHECK(ok IN (0,1)),
  http_status INTEGER,
  latency_ms INTEGER,
  note TEXT NOT NULL,
  probe_depth TEXT NOT NULL DEFAULT 'none'
);
CREATE INDEX IF NOT EXISTS idx_source_checks_source_time ON source_checks(source_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS playback_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK(reason IN ('startup','network','stalled','decode','forbidden','not_found')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_playback_reports_time ON playback_reports(created_at DESC);
