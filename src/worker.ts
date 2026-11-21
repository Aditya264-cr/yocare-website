interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/movies/playback") {
      if (request.method !== "GET") {
        return json({ error: "method_not_allowed", message: "Use GET for playback resolution." }, 405);
      }

      return json({
        error: "playback_not_configured",
        message: "Yocare does not yet have a licensed movie or series distribution provider connected. No stream can be supplied until an authorized provider integration is configured.",
        retryable: false,
      }, 503);
    }

    return env.ASSETS.fetch(request);
  },
};
