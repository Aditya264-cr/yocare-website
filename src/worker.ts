interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  MOVIE_PLAYBACK_RESOLVER_URL?: string;
  MOVIE_PLAYBACK_RESOLVER_TOKEN?: string;
  MOVIE_PLAYBACK_ALLOWED_HOSTS?: string;
  CF_ACCOUNT_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_BROWSER_RUN_TOKEN?: string;
  BROWSER_ALLOWED_HOSTS?: string;
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, private",
  "x-content-type-options": "nosniff",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function allowedHosts(env: Env): Set<string> {
  return new Set((env.MOVIE_PLAYBACK_ALLOWED_HOSTS || "")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
}

function browserHosts(env: Env): Set<string> {
  return new Set((env.BROWSER_ALLOWED_HOSTS || "net77.cc,www.net77.cc,duckduckgo.com,www.duckduckgo.com")
    .split(",").map((host) => host.trim().toLowerCase()).filter(Boolean));
}

async function cfRequest(env: Env, path: string, init: RequestInit = {}): Promise<any> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID;
  if (!accountId) throw new Error("Cloudflare account ID is not configured.");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      "authorization": `Bearer ${env.CF_BROWSER_RUN_TOKEN}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json() as { success?: boolean; result?: any; errors?: Array<{ message?: string }> };
  if (!response.ok || body.success === false || body.result == null) {
    throw new Error(body.errors?.[0]?.message || `Cloudflare Browser Run request failed (${response.status})`);
  }
  return body.result;
}

async function createBrowserSession(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "origin_not_allowed" }, 403);
  if (!(env.CLOUDFLARE_ACCOUNT_ID || env.CF_ACCOUNT_ID) || !env.CF_BROWSER_RUN_TOKEN) {
    return json({
      error: "browser_not_configured",
      message: "Cloudflare Browser Run is not configured yet. Add the account ID and Browser Run API token as Worker secrets/variables.",
    }, 503);
  }

  let target: URL;
  try {
    const payload = await request.json() as { url?: string };
    target = new URL(payload.url || "https://net77.cc/home");
    if (!["https:", "http:"].includes(target.protocol)) throw new Error("Only HTTP and HTTPS websites are supported.");
    const hosts = browserHosts(env);
    if (!hosts.has(target.hostname.toLowerCase())) {
      return json({ error: "host_not_allowed", message: "This starting website is not in Yocare's browser allowlist." }, 403);
    }
  } catch (error) {
    return json({ error: "invalid_browser_request", message: error instanceof Error ? error.message : "A valid website URL is required." }, 400);
  }

  let sessionId = "";
  try {
    const session = await cfRequest(env, "/browser-rendering/devtools/browser?keep_alive=600000", { method: "POST" });
    sessionId = String(session.sessionId || "");
    if (!sessionId) throw new Error("Cloudflare did not return a browser session ID.");

    const targetPath = `/browser-rendering/devtools/browser/${encodeURIComponent(sessionId)}/json/new?${encodeURIComponent(target.toString())}`;
    await cfRequest(env, targetPath, { method: "PUT" });

    const liveView = await cfRequest(env, `/browser-rendering/devtools/browser/${encodeURIComponent(sessionId)}/live_view`, {
      method: "POST",
      body: JSON.stringify({ mode: "tab", expiresInMs: 300000 }),
    });
    if (typeof liveView.devtoolsFrontendUrl !== "string" || !liveView.devtoolsFrontendUrl.startsWith("https://live.browser.run/")) {
      throw new Error("Cloudflare did not return a valid Live View URL.");
    }
    return json({ sessionId, liveViewUrl: liveView.devtoolsFrontendUrl, expiresInMs: 300000 });
  } catch (error) {
    if (sessionId) {
      try {
        await cfRequest(env, `/browser-rendering/devtools/browser/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      } catch {
        // Best-effort cleanup if session creation fails partway through.
      }
    }
    return json({
      error: "browser_session_failed",
      message: error instanceof Error ? error.message.slice(0, 240) : "Could not start the remote browser session.",
    }, 502);
  }
}

async function resolvePlayback(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "method_not_allowed", message: "Use GET for playback resolution." }, 405);
  }
  const incoming = new URL(request.url);
  const tmdbId = incoming.searchParams.get("tmdb_id") || "";
  const mediaType = incoming.searchParams.get("media_type") || "";
  const region = (incoming.searchParams.get("region") || "").toUpperCase();
  if (!/^\d{1,12}$/.test(tmdbId) || !["movie", "tv"].includes(mediaType) || !/^[A-Z]{2}$/.test(region)) {
    return json({ error: "invalid_request", message: "A valid TMDB ID, media type and two-letter region are required." }, 400);
  }
  if (!env.MOVIE_PLAYBACK_RESOLVER_URL || !env.MOVIE_PLAYBACK_RESOLVER_TOKEN) {
    return json({ error: "playback_not_configured", message: "Yocare's authorized playback provider has not been connected yet.", retryable: false }, 503);
  }
  let resolver: URL;
  try {
    resolver = new URL(env.MOVIE_PLAYBACK_RESOLVER_URL);
    if (resolver.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    return json({ error: "resolver_misconfigured", message: "The playback resolver URL must be a valid HTTPS URL." }, 503);
  }
  try {
    const upstream = await fetch(resolver.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json", "authorization": `Bearer ${env.MOVIE_PLAYBACK_RESOLVER_TOKEN}` },
      body: JSON.stringify({ tmdbId, mediaType, region }),
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) return json({ error: "provider_unavailable", message: "The authorized playback provider could not create a session.", retryable: upstream.status >= 500 }, 502);
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) return json({ error: "invalid_provider_response", message: "The playback provider returned an unsupported response." }, 502);
    const result = await upstream.json() as { rightsVerified?: boolean; playbackUrl?: string; message?: string };
    if (result.rightsVerified !== true || typeof result.playbackUrl !== "string") {
      return json({ rightsVerified: false, message: typeof result.message === "string" ? result.message.slice(0, 300) : "No authorized in-app playback session is available for this title." });
    }
    let playback: URL;
    try { playback = new URL(result.playbackUrl); } catch { return json({ error: "invalid_playback_url", message: "The provider returned an invalid playback address." }, 502); }
    const hosts = allowedHosts(env);
    if (playback.protocol !== "https:" || hosts.size === 0 || !hosts.has(playback.hostname.toLowerCase())) {
      return json({ error: "playback_host_not_allowed", message: "The provider playback host is not in Yocare's configured allowlist." }, 502);
    }
    return json({ rightsVerified: true, playbackUrl: playback.toString() });
  } catch {
    return json({ error: "resolver_timeout", message: "Yocare could not reach its authorized playback provider. Please try again later.", retryable: true }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/movies/playback") return resolvePlayback(request, env);
    if (url.pathname === "/api/browser/session") return createBrowserSession(request, env);
    return env.ASSETS.fetch(request);
  },
};
