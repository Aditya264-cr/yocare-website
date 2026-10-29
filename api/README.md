# Yocare Live source registry (v1)

This is a separate Cloudflare Worker for source discovery and health monitoring. It does not replace the existing static website Worker. The `tv.js` player has optional registry integration: when the endpoint is configured, it queries approved alternatives after its current public playlist candidates fail and reports failures for registry-managed sources.

## Responsibilities

- Store canonical channel IDs and approved source URLs in D1.
- Return alternative source candidates for one exact channel.
- Accept playback failure reports from the player without accepting arbitrary URLs.
- Run scheduled reachability checks every five minutes in bounded batches and record health history.
- Keep administrative writes behind a secret bearer token.

## Important reliability boundary

An HTTP check reads only a small response prefix and can confirm a recognizable HLS/DASH manifest or media response is reachable. It cannot prove that media segments decode, that the feed contains the expected channel, or that a viewer's region is allowed. Browser playback reports and provider status are required for stronger confidence. The API reports reachability, not a channel uptime guarantee. This service does not discover unauthorized IPs, bypass DRM, evade geoblocking, or scrape private endpoints. Add only sources you have permission to access and distribute.

## Create and deploy

1. In Cloudflare, create a D1 database named `yocare-live-registry`.
2. Copy its database ID into `api/wrangler.jsonc`.
3. From the repository root, run `npx wrangler d1 migrations apply yocare-live-registry --remote --config api/wrangler.jsonc`.
4. Set an admin secret: `npx wrangler secret put REGISTRY_ADMIN_TOKEN --config api/wrangler.jsonc`.
5. Deploy: `npx wrangler deploy --config api/wrangler.jsonc`.
6. Add an API origin custom domain or use the Worker URL initially. Add the exact website origin to `ALLOWED_ORIGINS` (or configure `DEV_ORIGIN` for local testing).
7. In the deployed app at `public/index.html`, set the `content` of the `meta[name="yocare-live-registry-url"]` element to the registry base URL, without a trailing slash. The production player checks this registry after its listed playlist candidates fail. Keep it empty until the API is deployed and CORS is configured.

The database ID is deliberately a placeholder. Do not deploy until it has been replaced with the real ID. Never commit the admin token.

## API

- `GET /api/health` — worker and database check.
- `GET /api/channels/:channelId/sources` — approved source candidates for a channel.
- `POST /api/report` — report a playback failure. Body: `{ "channel_id":"...", "source_id":"...", "reason":"network" }`.
- `POST /admin/channels` — bearer-authenticated upsert: `{ "id":"...", "name":"...", "country_code":"in" }`.
- `POST /admin/sources` — bearer-authenticated upsert: `{ "id":"...", "channel_id":"...", "url":"https://...", "source_type":"hls", "priority":10 }`.

## Current scope and next milestones

The production player reads the registry URL configured in `public/index.html`; if the API is unavailable, the page continues with its existing playlist fallback behavior. Channel IDs must match the stable IDs inserted in D1; the playlist `tvg-id` is preferred, with normalized channel identity as a fallback. No production source records are seeded and no live EPG feed is configured, so the registry cannot provide additional live sources until authorized feeds are registered. Before production, verify the API deployment and CORS, register authorized feeds, run browser-level failover checks, and add rate limits plus retention for health logs.

## Security notes

- Keep the admin token server-side only.
- Admin routes require a bearer token.
- Source URLs must be HTTP(S); local/private address patterns are rejected. Register only playback URLs Yocare is authorized to use. Do not place broadcaster passwords, API keys or expiring secrets in source URLs returned by the public source endpoint.
- Health checks do not follow redirects, reducing redirect-based SSRF exposure.
- Add Cloudflare rate limiting and request-size limits before public production exposure.


## Delivery pipeline boundary

The registry selects approved playback candidates and monitors response reachability. It does not ingest, transcode, package or re-host a broadcaster's feed. A browser cannot make an offline upstream source live.

For channels whose owners can push a contribution feed, evaluate Cloudflare Stream Live or Mux using the broadcaster's RTMPS/SRT credentials. For an authorized HLS pull feed that needs normalization, evaluate AWS Elemental MediaLive with an origin/packager and CDN. Each service needs an account, channel-owner authorization and separate configuration. Do not re-stream a public playlist URL through Yocare unless the broadcaster has granted that distribution right.
