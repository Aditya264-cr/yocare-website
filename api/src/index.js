const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const ALLOWED_ORIGINS = new Set(["https://yocare.online", "https://www.yocare.online"]);

function response(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = new Set(ALLOWED_ORIGINS);
  if (env.DEV_ORIGIN) allowed.add(env.DEV_ORIGIN);
  return origin && allowed.has(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    "vary": "Origin"
  } : {};
}
function validId(value) { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(value); }
function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        host === "0.0.0.0" || host === "::1" || host.startsWith("127.") ||
        host.startsWith("10.") || host.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.startsWith("169.254.")) return false;
    return true;
  } catch { return false; }
}
function admin(request, env) {
  const supplied = request.headers.get("Authorization") || "";
  return Boolean(env.REGISTRY_ADMIN_TOKEN && supplied === "Bearer " + env.REGISTRY_ADMIN_TOKEN);
}
async function getSources(env, channelId) {
  const { results = [] } = await env.DB.prepare(
    `SELECT s.id, s.url, s.source_type, s.priority, s.last_checked_at, s.last_ok_at,
            s.last_status, s.consecutive_failures,
            CASE WHEN s.last_ok_at IS NOT NULL AND s.last_ok_at >= datetime('now','-15 minutes') THEN 1 ELSE 0 END AS healthy
     FROM sources s JOIN channels c ON c.id = s.channel_id
     WHERE s.channel_id = ? AND s.enabled = 1 AND c.enabled = 1
     ORDER BY healthy DESC, s.priority ASC, s.consecutive_failures ASC, s.last_ok_at DESC`
  ).bind(channelId).all();
  return results;
}
async function checkSource(env, source) {
  const started = Date.now();
  let ok = false, status = 0, note = "unavailable";
  try {
    if (!safeSourceUrl(source.url)) throw new Error("URL rejected by source policy");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(source.url, {
        method: "GET",
        headers: { "range": "bytes=0-2047", "user-agent": "YocareLiveHealth/1.0" },
        redirect: "manual",
        signal: controller.signal
      });
    } finally { clearTimeout(timeout); }
    status = res.status;
    if (status >= 300 && status < 400) {
      note = "redirect-not-followed";
      await res.body?.cancel();
    } else if (res.ok) {
      const type = (res.headers.get("content-type") || "").toLowerCase();
      const body = await res.text();
      const looksLikeHls = body.trimStart().startsWith("#EXTM3U");
      const looksLikeManifest = /\.m3u8?(?:$|[?#])/i.test(new URL(source.url).pathname) || /mpegurl/.test(type);
      const looksLikeMedia = /video|audio|octet-stream/.test(type) || /\.(mp4|m4v|webm|mp3|aac)(?:$|[?#])/i.test(source.url);
      ok = looksLikeHls ? body.includes("#EXTINF") || body.includes("#EXT-X-STREAM-INF") : looksLikeManifest ? false : looksLikeMedia;
      note = ok ? "reachable" : "content-not-verified";
    } else {
      note = "http-error";
      await res.body?.cancel();
    }
  } catch (error) {
    note = error?.name === "AbortError" ? "timeout" : "network-error";
  }
  const elapsed = Date.now() - started;
  await env.DB.prepare(
    `INSERT INTO source_checks (source_id, checked_at, ok, http_status, latency_ms, note)
     VALUES (?, datetime('now'), ?, ?, ?, ?)`
  ).bind(source.id, ok ? 1 : 0, status || null, elapsed, note).run();
  await env.DB.prepare(
    `UPDATE sources SET last_checked_at = datetime('now'), last_status = ?, last_latency_ms = ?,
      last_ok_at = CASE WHEN ? = 1 THEN datetime('now') ELSE last_ok_at END,
      consecutive_failures = CASE WHEN ? = 1 THEN 0 ELSE consecutive_failures + 1 END
     WHERE id = ?`
  ).bind(status || null, elapsed, ok ? 1 : 0, ok ? 1 : 0, source.id).run();
  return { id: source.id, ok, status, latency_ms: elapsed, note };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT 1 AS ok").first();
        return response({ ok: result?.ok === 1, service: "yocare-live-registry", version: 1 }, 200, headers);
      }
      const sourceMatch = url.pathname.match(/^\/api\/channels\/([^/]+)\/sources$/);
      if (sourceMatch && request.method === "GET") {
        const channelId = decodeURIComponent(sourceMatch[1]);
        if (!validId(channelId)) return response({ error: "invalid_channel_id" }, 400, headers);
        const channel = await env.DB.prepare("SELECT id, name, country_code FROM channels WHERE id = ? AND enabled = 1").bind(channelId).first();
        if (!channel) return response({ error: "channel_not_found", sources: [] }, 404, headers);
        const sources = await getSources(env, channelId);
        return response({
          channel: { id: channel.id, name: channel.name, country_code: channel.country_code },
          sources: sources.map(s => ({ id: s.id, url: s.url, type: s.source_type, priority: s.priority, health: s.healthy ? "recently-healthy" : s.last_checked_at ? "unknown-or-unhealthy" : "untested" })),
          checked_at: sources.reduce((latest, s) => s.last_checked_at && s.last_checked_at > latest ? s.last_checked_at : latest, "")
        }, 200, headers);
      }
      if (url.pathname === "/api/report" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || !validId(body.channel_id) || !validId(body.source_id) ||
            !["startup", "network", "stalled", "decode", "forbidden", "not_found"].includes(body.reason)) {
          return response({ error: "invalid_report" }, 400, headers);
        }
        const source = await env.DB.prepare("SELECT id, channel_id FROM sources WHERE id = ? AND enabled = 1").bind(body.source_id).first();
        if (!source || source.channel_id !== body.channel_id) return response({ error: "source_not_found" }, 404, headers);
        await env.DB.prepare(
          "INSERT INTO playback_reports (channel_id, source_id, reason, created_at) VALUES (?, ?, ?, datetime('now'))"
        ).bind(body.channel_id, body.source_id, body.reason).run();
        return response({ accepted: true }, 202, headers);
      }
      if (url.pathname.startsWith("/admin/")) {
        if (!admin(request, env)) return response({ error: "unauthorized" }, 401, headers);
        if (url.pathname === "/admin/channels" && request.method === "POST") {
          const body = await request.json().catch(() => null);
          if (!body || !validId(body.id) || typeof body.name !== "string" || body.name.length < 1 || body.name.length > 160 ||
              typeof body.country_code !== "string" || !/^[a-z]{2}$/i.test(body.country_code)) return response({ error: "invalid_channel" }, 400, headers);
          await env.DB.prepare("INSERT INTO channels (id, name, country_code, enabled) VALUES (?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name=excluded.name, country_code=excluded.country_code, enabled=1")
            .bind(body.id, body.name, body.country_code.toLowerCase()).run();
          return response({ saved: true, id: body.id }, 201, headers);
        }
        if (url.pathname === "/admin/sources" && request.method === "POST") {
          const body = await request.json().catch(() => null);
          if (!body || !validId(body.id) || !validId(body.channel_id) || typeof body.url !== "string" || !safeSourceUrl(body.url) ||
              !["hls", "dash", "direct", "unknown"].includes(body.source_type || "unknown") ||
              !Number.isInteger(body.priority ?? 100) || (body.priority ?? 100) < 1 || (body.priority ?? 100) > 10000) {
            return response({ error: "invalid_source" }, 400, headers);
          }
          const channel = await env.DB.prepare("SELECT id FROM channels WHERE id = ? AND enabled = 1").bind(body.channel_id).first();
          if (!channel) return response({ error: "channel_not_found" }, 404, headers);
          await env.DB.prepare(
            `INSERT INTO sources (id, channel_id, url, source_type, priority, enabled)
             VALUES (?, ?, ?, ?, ?, 1)
             ON CONFLICT(id) DO UPDATE SET channel_id=excluded.channel_id, url=excluded.url, source_type=excluded.source_type, priority=excluded.priority, enabled=1`
          ).bind(body.id, body.channel_id, body.url, body.source_type || "unknown", body.priority ?? 100).run();
          return response({ saved: true, id: body.id }, 201, headers);
        }
        return response({ error: "admin_route_not_found" }, 404, headers);
      }
      return response({ error: "not_found" }, 404, headers);
    } catch (error) {
      console.error("Yocare Live registry error", { path: url.pathname, message: String(error?.message || error) });
      return response({ error: "internal_error" }, 500, headers);
    }
  },
  async scheduled(_controller, env) {
    const { results = [] } = await env.DB.prepare(
      "SELECT id, url FROM sources WHERE enabled = 1 ORDER BY last_checked_at ASC LIMIT 100"
    ).all();
    for (let i = 0; i < results.length; i += 1) {
      await checkSource(env, results[i]);
    }
  }
};
