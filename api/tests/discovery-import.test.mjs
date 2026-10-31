import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const importer = await readFile(new URL("../../scripts/sync-iptv-discovery.mjs", import.meta.url), "utf8");
const migration = await readFile(new URL("../migrations/0005_discovery_catalogue.sql", import.meta.url), "utf8");
const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

test("discovery import preserves submitted metadata but never creates playback sources", () => {
  assert.match(importer, /stream\.referrer\s*\|\|\s*stream\.http_referrer/);
  assert.match(importer, /stream\.user_agent\s*\|\|\s*stream\.userAgent/);
  assert.match(importer, /INSERT INTO discovery_streams/);
  assert.doesNotMatch(importer, /INSERT INTO sources/);
  assert.doesNotMatch(importer, /INSERT INTO channels/);
  assert.match(importer, /const channelId = null/);
  assert.match(importer, /playback_sources_created:\s*0/);
});

test("discovery records are isolated from the authorized playback registry", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS discovery_streams/);
  assert.match(migration, /review_status TEXT NOT NULL DEFAULT 'discovered'/);
  assert.match(worker, /FROM sources s JOIN channels c/);
  assert.doesNotMatch(worker, /FROM discovery_streams/);
});
