const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_ORIGIN = "https://yocare.online";

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") ||
        host.endsWith(".local") || host.endsWith(".internal") || host.includes(":") ||
        /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function territoryAllows(regions, country) {
  if (!Array.isArray(regions) || !/^[A-Z]{2}$/.test(String(country || "").toUpperCase())) return false;
  const normalized = regions.map(value => String(value).toUpperCase());
  return normalized.includes("*") || normalized.includes(String(country).toUpperCase());
}

async function readPrefix(response, maxBytes = 16384) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const result = await reader.read();
      if (result.done) break;
      const count = Math.min(result.value.byteLength, maxBytes - total);
      chunks.push(result.value.subarray(0, count));
      total += count;
      if (count < result.value.byteLength || total >= maxBytes) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function corsAllowed(response, origin) {
  const allowed = response.headers.get("access-control-allow-origin");
  return allowed === "*" || allowed === origin;
}

async function safeFetch(url, options) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (!safeSourceUrl(current.href)) throw new Error("unsafe-redirect");
    const requestStarted = Date.now();
    const response = await options.fetchImpl(current.href, {
      method: "GET",
      redirect: "manual",
      signal: options.signal,
      headers: {
        Origin: options.origin,
        Range: options.range || "bytes=0-16383",
        "User-Agent": "YocareLiveHealth/2.0"
      }
    });
    const ttfb_ms = Date.now() - requestStarted;
    if (!REDIRECT_STATUSES.has(response.status)) return { response, url: current.href, ttfb_ms };
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location || redirects === 3) throw new Error("redirect-limit");
    current = new URL(location, current);
  }
  throw new Error("redirect-limit");
}

async function readMedia(url, options) {
  const result = await safeFetch(url, { ...options, range: "bytes=0-1023" });
  const response = result.response;
  if (!response.ok) {
    await response.body?.cancel();
    return { ok: false, status: response.status, note: "media-request-failed" };
  }
  if (!corsAllowed(response, options.origin)) {
    await response.body?.cancel();
    return { ok: false, status: response.status, note: "cors-blocked" };
  }
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (type.includes("text/html")) {
    await response.body?.cancel();
    return { ok: false, status: response.status, note: "media-response-was-html" };
  }
  const body = await readPrefix(response, 1024);
  return body.length
    ? { ok: true, status: response.status, url: result.url, ttfb_ms: result.ttfb_ms }
    : { ok: false, status: response.status, note: "empty-media-response", ttfb_ms: result.ttfb_ms };
}

function mediaUri(lines) {
  let expectingVariant = false;
  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;
    if (value.startsWith("#EXT-X-STREAM-INF:")) {
      expectingVariant = true;
      continue;
    }
    if (expectingVariant && !value.startsWith("#")) return { uri: value, kind: "variant" };
    if (value.startsWith("#EXT-X-PART:")) {
      const match = value.match(/URI="([^"]+)"/);
      if (match) return { uri: match[1], kind: "segment" };
    }
    if (!value.startsWith("#")) return { uri: value, kind: "segment" };
  }
  return null;
}

export async function inspectSource(source, options = {}) {
  const started = Date.now();
  const fetchImpl = options.fetchImpl || fetch;
  const origin = options.origin || DEFAULT_ORIGIN;
  const timeoutMs = options.timeoutMs ?? 4000;
  const sourceType = source.source_type || source.type || "unknown";
  const result = (ok, status, note, depth) => ({
    id: source.id,
    ok,
    status: status || null,
    latency_ms: Date.now() - started,
    ttfb_ms: lastTtfbMs,
    latency_tier: lastTtfbMs == null ? "unknown" : lastTtfbMs > 2500 ? "slow" : "fast",
    note,
    probe_depth: depth
  });

  if (!safeSourceUrl(source.url)) return result(false, null, "https-required-or-unsafe-url", "none");
  let lastTtfbMs = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestOptions = { fetchImpl, origin, signal: controller.signal };

  try {
    const root = await safeFetch(source.url, requestOptions);
    lastTtfbMs = root.ttfb_ms;
    const response = root.response;
    if (!response.ok) {
      await response.body?.cancel();
      return result(false, response.status, "manifest-request-failed", "none");
    }
    if (!corsAllowed(response, origin)) {
      await response.body?.cancel();
      return result(false, response.status, "cors-blocked", "manifest");
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const body = await readPrefix(response);
    const looksHls = body.trimStart().startsWith("#EXTM3U");
    const looksDash = /<MPD(?:\s|>)/i.test(body);

    if (sourceType === "hls" || looksHls || /mpegurl/.test(contentType)) {
      if (!looksHls || !/#EXT(?:INF|-X-STREAM-INF|-X-PART):/.test(body)) {
        return result(false, response.status, "invalid-hls-manifest", "manifest");
      }
      const first = mediaUri(body.split(/\r?\n/));
      if (!first) return result(false, response.status, "hls-manifest-has-no-media-uri", "manifest");
      let mediaUrl;
      try { mediaUrl = new URL(first.uri, root.url).href; } catch {
        return result(false, response.status, "invalid-hls-media-uri", "manifest");
      }
      if (!safeSourceUrl(mediaUrl)) return result(false, response.status, "unsafe-hls-media-uri", "manifest");

      let mediaPlaylistUrl = mediaUrl;
      if (first.kind === "variant") {
        const variant = await safeFetch(mediaUrl, requestOptions);
        lastTtfbMs = variant.ttfb_ms;
        if (!variant.response.ok || !corsAllowed(variant.response, origin)) {
          const status = variant.response.status;
          await variant.response.body?.cancel();
          return result(false, status, variant.response.ok ? "cors-blocked" : "hls-variant-request-failed", "variant");
        }
        const variantBody = await readPrefix(variant.response);
        if (!variantBody.trimStart().startsWith("#EXTM3U") || !/#EXT(?:INF|-X-PART):/.test(variantBody)) {
          return result(false, variant.response.status, "invalid-hls-variant", "variant");
        }
        mediaPlaylistUrl = variant.url;
        const segment = mediaUri(variantBody.split(/\r?\n/));
        if (!segment) return result(false, variant.response.status, "hls-variant-has-no-media-uri", "variant");
        try { mediaUrl = new URL(segment.uri, mediaPlaylistUrl).href; } catch {
          return result(false, variant.response.status, "invalid-hls-segment-uri", "variant");
        }
        if (!safeSourceUrl(mediaUrl)) return result(false, variant.response.status, "unsafe-hls-segment-uri", "variant");
      }

      const segmentResult = await readMedia(mediaUrl, requestOptions);
      lastTtfbMs = segmentResult.ttfb_ms ?? lastTtfbMs;
      if (!segmentResult.ok) return result(false, segmentResult.status, segmentResult.note, "segment");
      return result(true, segmentResult.status, lastTtfbMs > 2500 ? "manifest-and-segment-reachable-slow" : "manifest-and-first-segment-reachable", "segment");
    }

    if (sourceType === "dash" || looksDash || /\.mpd(?:$|[?#])/i.test(new URL(source.url).pathname)) {
      if (!looksDash) return result(false, response.status, "invalid-dash-manifest", "manifest");
      return result(true, response.status, "dash-manifest-reachable-segments-not-probed", "manifest");
    }

    if (sourceType === "direct") {
      const mediaType = /video|audio|octet-stream/.test(contentType);
      return result(mediaType, response.status, mediaType ? "direct-media-reachable-not-decoded" : "unexpected-media-content-type", "media");
    }

    return result(false, response.status, "unknown-source-format", "manifest");
  } catch (error) {
    const note = error?.name === "AbortError"
      ? "timeout"
      : error?.message === "cors-blocked"
        ? "cors-blocked"
        : error?.message === "redirect-limit" || error?.message === "unsafe-redirect"
          ? "unsafe-or-excessive-redirect"
          : "network-error";
    return result(false, null, note, "none");
  } finally {
    clearTimeout(timeout);
  }
}
