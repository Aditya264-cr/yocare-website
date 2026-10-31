import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const player = await readFile(new URL("../../public/tv.js", import.meta.url), "utf8");
const section = (start, end) => {
  const from = player.indexOf(start);
  const to = player.indexOf(end, from);
  assert.notEqual(from, -1, "missing section: " + start);
  assert.notEqual(to, -1, "missing end section: " + end);
  return player.slice(from, to);
};

test("IPTV-org playlist parsing is metadata-only", () => {
  const parser = section("function parsePlaylist(", "function setLoading(");
  assert.match(parser, /pending\.urls = \[\]/);
  assert.match(parser, /pending\.url = ""/);
  assert.doesNotMatch(parser, /pending\.url = url/);
  assert.doesNotMatch(parser, /pending\.urls\.push/);
  assert.match(parser, /registryId = pending\.idKey \+ "@" \+ String\(countryCode/);
});

test("channel selection resolves authorized registry sources before starting playback", () => {
  const selection = section("function playChannel(", "function startSource(");
  assert.match(selection, /refreshRegistrySources\(selection\)/);
  assert.match(selection, /startSource\(selection, 0\)/);
  assert.ok(selection.indexOf("refreshRegistrySources(selection)") < selection.indexOf("startSource(selection, 0)"));
});

test("HLS sources are played through the registry rights-checking proxy", () => {
  const registry = section("function refreshRegistrySources(", "function reportRegistryFailure(");
  assert.match(registry, /source\.type[\s\S]*?=== "hls"/);
  assert.match(registry, /\/api\/proxy/);
  assert.match(registry, /source_id/);
  assert.match(registry, /registrySourceIds\[playbackUrl\] = source\.id/);
});

test("player fallback never fetches raw IPTV-org streams as alternate playback URLs", () => {
  const fallback = section("function tryNextSource(", "function renderCategories(");
  assert.doesNotMatch(fallback, /refreshUpstreamSources|fetchPlaylistText/);
});
