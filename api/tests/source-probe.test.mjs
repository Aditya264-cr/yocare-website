import test from "node:test";
import assert from "node:assert/strict";
import { inspectSource, safeSourceUrl, territoryAllows } from "../src/source-probe.mjs";

const origin = "https://yocare.online";
const corsHeaders = { "access-control-allow-origin": origin };

test("source policy accepts secure public URLs and rejects insecure or private targets", () => {
  assert.equal(safeSourceUrl("https://cdn.example.org/live/index.m3u8"), true);
  assert.equal(safeSourceUrl("http://cdn.example.org/live/index.m3u8"), false);
  assert.equal(safeSourceUrl("https://127.0.0.1/live.m3u8"), false);
  assert.equal(safeSourceUrl("https://[::ffff:127.0.0.1]/live.m3u8"), false);
  assert.equal(safeSourceUrl("https://user:pass@cdn.example.org/live.m3u8"), false);
});

test("rights territories fail closed and support explicit worldwide authorization", () => {
  assert.equal(territoryAllows(["IN", "GB"], "IN"), true);
  assert.equal(territoryAllows(["IN", "GB"], "US"), false);
  assert.equal(territoryAllows(["*"], "US"), true);
  assert.equal(territoryAllows(["*"], ""), false);
});

test("HLS probe checks a master playlist, media playlist, and first segment", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith("/master.m3u8")) {
      return new Response("#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=900000\nvariant.m3u8\n", {
        headers: { ...corsHeaders, "content-type": "application/vnd.apple.mpegurl" }
      });
    }
    if (url.endsWith("/variant.m3u8")) {
      return new Response("#EXTM3U\n#EXTINF:6,\nsegment-001.ts\n", {
        headers: { ...corsHeaders, "content-type": "application/vnd.apple.mpegurl" }
      });
    }
    return new Response(new Uint8Array([0x47, 0x40, 0x00]), {
      headers: { ...corsHeaders, "content-type": "video/mp2t" }
    });
  };

  const result = await inspectSource(
    { id: "channel-primary", source_type: "hls", url: "https://cdn.example.org/master.m3u8" },
    { fetchImpl, origin }
  );

  assert.equal(result.ok, true);
  assert.equal(result.probe_depth, "segment");
  assert.equal(result.note, "manifest-and-first-segment-reachable");
  assert.deepEqual(calls, [
    "https://cdn.example.org/master.m3u8",
    "https://cdn.example.org/variant.m3u8",
    "https://cdn.example.org/segment-001.ts"
  ]);
});

test("HLS probe reports missing browser CORS permission", async () => {
  const result = await inspectSource(
    { id: "channel-no-cors", source_type: "hls", url: "https://cdn.example.org/live.m3u8" },
    { fetchImpl: async () => new Response("#EXTM3U\n#EXTINF:6,\npart.ts\n", {
      headers: { "content-type": "application/vnd.apple.mpegurl" }
    }), origin }
  );

  assert.equal(result.ok, false);
  assert.equal(result.note, "cors-blocked");
  assert.equal(result.probe_depth, "manifest");
});

test("HLS probe rejects unsafe redirect destinations", async () => {
  const result = await inspectSource(
    { id: "channel-redirect", source_type: "hls", url: "https://cdn.example.org/live.m3u8" },
    { fetchImpl: async () => new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private.m3u8" }
    }), origin }
  );

  assert.equal(result.ok, false);
  assert.equal(result.note, "unsafe-or-excessive-redirect");
});
