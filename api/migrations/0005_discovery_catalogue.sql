CREATE TABLE IF NOT EXISTS discovery_streams (
  source_key TEXT PRIMARY KEY,
  catalogue_channel_id TEXT NOT NULL,
  channel_id TEXT,
  channel_name TEXT NOT NULL,
  country_code TEXT,
  source_url TEXT NOT NULL,
  source_host TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'unknown' CHECK(source_type IN ('hls','dash','direct','unknown')),
  referrer TEXT,
  user_agent TEXT,
  review_status TEXT NOT NULL DEFAULT 'discovered' CHECK(review_status IN ('discovered','review-required','approved','rejected')),
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_probe_at TEXT,
  last_probe_status INTEGER,
  last_probe_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_discovery_channel ON discovery_streams(channel_id, review_status);
CREATE INDEX IF NOT EXISTS idx_discovery_host ON discovery_streams(source_host);
CREATE INDEX IF NOT EXISTS idx_discovery_seen ON discovery_streams(last_seen_at DESC);
