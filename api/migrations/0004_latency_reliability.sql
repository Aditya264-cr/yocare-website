ALTER TABLE sources ADD COLUMN latency_ms INTEGER;
ALTER TABLE sources ADD COLUMN reliability_score INTEGER NOT NULL DEFAULT 50 CHECK(reliability_score BETWEEN 0 AND 100);

UPDATE sources SET latency_ms = last_latency_ms WHERE latency_ms IS NULL;

CREATE INDEX IF NOT EXISTS idx_sources_latency ON sources(channel_id, latency_ms, reliability_score);
