ALTER TABLE sources ADD COLUMN authorization_reference TEXT;
ALTER TABLE sources ADD COLUMN rights_regions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE sources ADD COLUMN rights_expires_at TEXT;
ALTER TABLE sources ADD COLUMN rights_verified_at TEXT;
ALTER TABLE sources ADD COLUMN last_probe_depth TEXT;
ALTER TABLE sources ADD COLUMN last_probe_note TEXT;

ALTER TABLE source_checks ADD COLUMN probe_depth TEXT NOT NULL DEFAULT 'none';

CREATE INDEX IF NOT EXISTS idx_sources_authorization
  ON sources(enabled, rights_verified_at, rights_expires_at);
