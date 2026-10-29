import { inspectSource, safeSourceUrl, territoryAllows } from "./source-probe.mjs";

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
function validId(value) { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:@-]{0,119}$/.test(value); }
function validRightsRegions(value) {
  return Array.isArray(value) && value.length > 0 && value.length <= 200 &&
    value.every(region => typeof region === "string" && (region === "*" || /^[a-z]{2}$/i.test(region))) &&
    new Set(value.map(region => region.toUpperCase())).size === value.length;
}
function requestCountry(request, env) {
  const country = String(request.cf?.country || "").toUpperCase();
  if (/^[A-Z]{2}$/.test(country) && country !== "XX") return country;
  const origin = request.headers.get("Origin") || "";
  const devCountry = String(env.DEV_COUNTRY || "").toUpperCase();
  if (env.DEV_ORIGIN && origin === env.DEV_ORIGIN && /^[A-Z]{2}$/.test(devCountry) && devCountry !== "XX") {
    return devCountry;
  }
  return "";
}
function parseRegions(value) {
  try {
    const regions = JSON.parse(value);
    return Array.isArray(regions) ? regions : [];
  } catch {
    return [];
  }
}
function admin(request, env) {
  const supplied = request.headers.get("Authorization") || "";
  return Boolean(env.REGISTRY_ADMIN_TOKEN && supplied === "Bearer " + env.REGISTRY_ADMIN_TOKEN);
}
async function getSources(env, channelId, country) {
  const { results = [] } = await env.DB.prepare(
    "SELECT s.id, s.url, s.source_type, s.priority, s.last_checked_at, s.last_ok_at, " +
    "s.last_status, s.consecutive_failures, s.last_probe_depth, s.last_probe_note, s.rights_regions, " +
    "CASE WHEN s.last_checked_at >= datetime('now','-15 minutes') AND s.consecutive_failures = 0 THEN 1 ELSE 0 END AS healthy " +
    "FROM sources s JOIN channels c ON c.id = s.channel_id " +
    "WHERE s.channel_id = ? AND s.enabled = 1 AND c.enabled = 1 " +
    "AND s.rights_verified_at IS NOT NULL AND length(trim(s.authorization_reference)) > 0 " +
    "AND (s.rights_expires_at IS NULL OR datetime(s.rights_expires_at) > datetime('now')) " +
    "ORDER BY healthy DESC, s.priority ASC, s.consecutive_failures ASC, s.last_ok_at DESC"
  ).bind(channelId).all();
  return results.filter(source => territoryAllows(parseRegions(source.rights_regions), country));
}

function proxySafeUrl(value, allowedHost) {
  try {
    const target = new URL(value);
    const host = target.hostname.toLowerCase().replace(/\.$/, "");
    if (!["https:", "http:"].includes(target.protocol) || target.username || target.password ||
        host !== allowedHost || host === "localhost" || host.endsWith(".localhost") ||
        host.endsWith(".local") || host.endsWith(".internal") ||
        /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return null;
    return target;
  } catch {
    return null;
  }
}
function proxyResponse(body, status, originHeaders, contentType, cacheControl = "no-store") {
  return new Response(body, {
    status,
    headers: {
      ...originHeaders,
      "content-type": contentType || "application/octet-stream",
      "cache-control": cacheControl,
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,HEAD,OPTIONS",
      "access-control-expose-headers": "Content-Length,Content-Range,Accept-Ranges",
      "x-content-type-options": "nosniff"
    }
  });
}
function rewriteHlsManifest(text, manifestUrl, sourceId, allowedHost) {
  const rewrite = raw => {
    const value = raw.trim();
    if (!value || value.startsWith("#")) return raw;
    const absolute = new URL(value, manifestUrl);
    const safe = proxySafeUrl(absolute.href, allowedHost);
    if (!safe) throw new Error("external_hls_host_not_allowed");
    return "/api/proxy?source_id=" + encodeURIComponent(sourceId) + "&url=" + encodeURIComponent(safe.href);
  };
  return text.split(/\r?\n/).map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
        const absolute = new URL(uri, manifestUrl);
        const safe = proxySafeUrl(absolute.href, allowedHost);
        if (!safe) throw new Error("external_hls_host_not_allowed");
        return 'URI="/api/proxy?source_id=' + encodeURIComponent(sourceId) + "&url=" + encodeURIComponent(safe.href) + '"';
      });
    }
    return rewrite(line);
  }).join("\n");
}
async function proxyAuthorizedStream(request, env, requestUrl) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD, OPTIONS" } });
  }
  const sourceId = requestUrl.searchParams.get("source_id") || "";
  const targetValue = requestUrl.searchParams.get("url") || "";
  if (!validId(sourceId) || !targetValue || targetValue.length > 4096) {
    return new Response("Invalid proxy request", { status: 400 });
  }
  const source = await env.DB.prepare(
    "SELECT s.id, s.url, s.rights_regions, s.rights_verified_at, s.authorization_reference, s.rights_expires_at " +
    "FROM sources s JOIN channels c ON c.id = s.channel_id WHERE s.id = ? AND s.enabled = 1 AND c.enabled = 1 " +
    "AND s.rights_verified_at IS NOT NULL AND length(trim(s.authorization_reference)) > 0 " +
    "AND (s.rights_expires_at IS NULL OR datetime(s.rights_expires_at) > datetime('now'))"
  ).bind(sourceId).first();
  const country = requestCountry(request, env);
  if (!source || !country || !territoryAllows(parseRegions(source.rights_regions), country)) {
    return new Response("Authorized source unavailable in this region", { status: 403 });
  }
  let registered;
  try { registered = new URL(source.url); } catch { return new Response("Invalid registered source", { status: 403 }); }
  const target = proxySafeUrl(targetValue, registered.hostname.toLowerCase().replace(/\.$/, ""));
  if (!target) return new Response("Target host is not authorized for this source", { status: 403 });

  const isManifest = /\.m3u8?$/i.test(target.pathname) || /mpegurl/i.test(request.headers.get("accept") || "");
  const cacheSeconds = isManifest ? 2 : 60;
  const range = request.headers.get("Range");
  const cacheKey = new Request(new URL("/__yocare_edge_cache?source_id=" + encodeURIComponent(sourceId) + "&country=" + encodeURIComponent(country) + "&url=" + encodeURIComponent(target.href), request.url).href, { method: "GET" });
  if (request.method === "GET" && !range) {
    try {
      const cached = await caches.default.match(cacheKey);
      if (cached) return cached;
    } catch { /* Cache API may be unavailable in local development. */ }
  }
  let current = target;
  let upstream;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    upstream = await fetch(current.href, {
      method: request.method,
      redirect: "manual",
      headers: {
        ...(range ? { Range: range } : {}),
        "User-Agent": "YocareLive/1.0",
        "Accept": request.headers.get("Accept") || "*/*"
      },
    });
    if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
    const location = upstream.headers.get("location");
    await upstream.body?.cancel();
    if (!location || redirects === 3) return new Response("Upstream redirect limit reached", { status: 502 });
    const next = proxySafeUrl(new URL(location, current).href, registered.hostname.toLowerCase().replace(/\.$/, ""));
    if (!next) return new Response("Cross-host redirects are not allowed", { status: 502 });
    current = next;
  }
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const headers = cors(request, env);
  if (!upstream.ok) {
    return proxyResponse(request.method === "HEAD" ? null : upstream.body, upstream.status, headers, contentType, "no-store");
  }
  if (isManifest || /mpegurl/i.test(contentType)) {
    const manifestText = await upstream.text();
    try {
      const rewritten = rewriteHlsManifest(manifestText, current.href, sourceId, registered.hostname.toLowerCase().replace(/\.$/, ""));
      const response = proxyResponse(rewritten, 200, headers, "application/vnd.apple.mpegurl; charset=utf-8", "public, max-age=2");
      if (request.method === "GET" && !range) {
        try { await caches.default.put(cacheKey, response.clone()); } catch { /* Keep playback working if edge cache is unavailable. */ }
      }
      return response;
    } catch {
      return proxyResponse("Manifest references an unapproved host", 502, headers, "text/plain; charset=utf-8", "no-store");
    }
  }
  const response = proxyResponse(request.method === "HEAD" ? null : upstream.body, upstream.status, headers, contentType,
    range || upstream.status !== 200 ? "no-store" : "public, max-age=60");
  if (request.method === "GET" && !range && upstream.status === 200) {
    try { await caches.default.put(cacheKey, response.clone()); } catch { /* Keep playback working if edge cache is unavailable. */ }
  }
  return response;
}

async function checkSource(env, source) {
  const result = await inspectSource(source);
  await env.DB.prepare(
    "INSERT INTO source_checks (source_id, checked_at, ok, http_status, latency_ms, note, probe_depth) " +
    "VALUES (?, datetime('now'), ?, ?, ?, ?, ?)"
  ).bind(source.id, result.ok ? 1 : 0, result.status, result.latency_ms, result.note, result.probe_depth).run();
  await env.DB.prepare(
    "UPDATE sources SET last_checked_at = datetime('now'), last_status = ?, last_latency_ms = ?, " +
    "last_probe_depth = ?, last_probe_note = ?, " +
    "last_ok_at = CASE WHEN ? = 1 THEN datetime('now') ELSE last_ok_at END, " +
    "consecutive_failures = CASE WHEN ? = 1 THEN 0 ELSE consecutive_failures + 1 END " +
    "WHERE id = ?"
  ).bind(result.status, result.latency_ms, result.probe_depth, result.note, result.ok ? 1 : 0, result.ok ? 1 : 0, source.id).run();
  return result;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    try {
      if (url.pathname === "/api/proxy" && (request.method === "GET" || request.method === "HEAD")) {\n        return await proxyAuthorizedStream(request, env, url);\n      }\n      if (url.pathname === "/api/health" && request.method === "GET") {
        const result = await env.DB.prepare("SELECT 1 AS ok").first();
        return response({ ok: result?.ok === 1, service: "yocare-live-registry", version: 2 }, 200, headers);
      }
      const sourceMatch = url.pathname.match(/^\/api\/channels\/([^/]+)\/sources$/);
      if (sourceMatch && request.method === "GET") {
        const channelId = decodeURIComponent(sourceMatch[1]);
        if (!validId(channelId)) return response({ error: "invalid_channel_id" }, 400, headers);
        const channel = await env.DB.prepare("SELECT id, name, country_code FROM channels WHERE id = ? AND enabled = 1").bind(channelId).first();
        if (!channel) return response({ error: "channel_not_found", sources: [] }, 404, headers);
        const country = requestCountry(request, env);
        if (!country) return response({ error: "viewer_region_unavailable", sources: [], retryable: true }, 503, headers);
        const sources = await getSources(env, channelId, country);
        return response({
          channel: { id: channel.id, name: channel.name, country_code: channel.country_code },
          region: country,
          sources: sources.map(s => ({
            id: s.id,
            url: s.url,
            type: s.source_type,
            priority: s.priority,
            health: s.healthy ? "recently-reachable" : s.last_checked_at ? "unknown-or-unhealthy" : "untested",
            probe: s.last_probe_depth || "none",
            note: s.last_probe_note || ""
          })),
          unavailable_reason: sources.length ? null : "no-authorized-feed-in-region",
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
        const disableMatch = url.pathname.match(/^\/admin\/sources\/([^/]+)\/disable$/);
        if (disableMatch && request.method === "POST") {
          const sourceId = decodeURIComponent(disableMatch[1]);
          if (!validId(sourceId)) return response({ error: "invalid_source_id" }, 400, headers);
          const result = await env.DB.prepare(
            "UPDATE sources SET enabled = 0, rights_verified_at = NULL, updated_at = datetime('now') WHERE id = ?"
          ).bind(sourceId).run();
          return response({ disabled: Boolean(result.meta?.changes), id: sourceId }, result.meta?.changes ? 200 : 404, headers);
        }
        if (url.pathname === "/admin/sources" && request.method === "POST") {
          const body = await request.json().catch(() => null);
          const sourceType = body && body.source_type;
          const regions = body && body.rights_regions;
          const authorizationReference = body && typeof body.authorization_reference === "string"
            ? body.authorization_reference.trim()
            : "";
          const expiry = body && body.rights_expires_at;
          const expiryTime = expiry ? Date.parse(expiry) : null;
          if (!body || !validId(body.id) || !validId(body.channel_id) || typeof body.url !== "string" || !safeSourceUrl(body.url) ||
              !["hls", "dash", "direct"].includes(sourceType) ||
              !validRightsRegions(regions) ||
              authorizationReference.length < 3 || authorizationReference.length > 200 ||
              (expiry && (!Number.isFinite(expiryTime) || expiryTime <= Date.now())) ||
              !Number.isInteger(body.priority ?? 100) || (body.priority ?? 100) < 1 || (body.priority ?? 100) > 10000) {
            return response({ error: "invalid_source_or_missing_rights" }, 400, headers);
          }
          const channel = await env.DB.prepare("SELECT id FROM channels WHERE id = ? AND enabled = 1").bind(body.channel_id).first();
          if (!channel) return response({ error: "channel_not_found" }, 404, headers);
          await env.DB.prepare(
            "INSERT INTO sources (id, channel_id, url, source_type, priority, enabled, authorization_reference, rights_regions, rights_expires_at, rights_verified_at) " +
            "VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, datetime('now')) " +
            "ON CONFLICT(id) DO UPDATE SET channel_id=excluded.channel_id, url=excluded.url, source_type=excluded.source_type, " +
            "priority=excluded.priority, enabled=1, authorization_reference=excluded.authorization_reference, rights_regions=excluded.rights_regions, " +
            "rights_expires_at=excluded.rights_expires_at, rights_verified_at=datetime('now'), last_checked_at=NULL, last_ok_at=NULL, last_status=NULL, last_latency_ms=NULL, last_probe_depth=NULL, last_probe_note=NULL, consecutive_failures=0"
          ).bind(body.id, body.channel_id, body.url, sourceType, body.priority ?? 100, authorizationReference,
            JSON.stringify(regions.map(region => region.toUpperCase())),
            expiry ? new Date(expiryTime).toISOString() : null).run();
          return response({ saved: true, id: body.id, authorized_regions: regions.length, rights_expire_at: expiry ? new Date(expiryTime).toISOString() : null }, 201, headers);
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
      "SELECT id, url, source_type FROM sources WHERE enabled = 1 AND rights_verified_at IS NOT NULL AND length(trim(authorization_reference)) > 0 AND (rights_expires_at IS NULL OR datetime(rights_expires_at) > datetime('now')) ORDER BY last_checked_at ASC LIMIT 100"
    ).all();
    const batchSize = 10;
    for (let i = 0; i < results.length; i += batchSize) {
      const settled = await Promise.allSettled(results.slice(i, i + batchSize).map(source => checkSource(env, source)));
      settled.forEach((result, offset) => {
        if (result.status === "rejected") {
          console.error("Yocare Live source check failed", {
            source: results[i + offset].id,
            message: String(result.reason?.message || result.reason)
          });
        }
      });
    }
  }
};
