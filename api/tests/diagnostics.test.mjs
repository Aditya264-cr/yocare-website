import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const worker = await readFile(new URL("../src/index.js", import.meta.url), "utf8");

test("public diagnostics distinguish discovery records from playback-ready sources", () => {
  const route = worker.slice(worker.indexOf('url.pathname === "/api/diagnostics"'), worker.indexOf("const sourceMatch", worker.indexOf('url.pathname === "/api/diagnostics"')));
  assert.match(route, /FROM discovery_streams/);
  assert.match(route, /FROM sources/);
  assert.match(route, /rights_verified_at IS NOT NULL/);
  assert.match(route, /recently_reachable_authorized_sources/);
  assert.match(route, /playback_ready/);
  assert.doesNotMatch(route, /source_url|referrer|user_agent/);
});
