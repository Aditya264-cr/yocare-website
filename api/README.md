# Yocare Live source registry (v1)

This is a separate Cloudflare Worker for source discovery and health monitoring. It does not replace the existing static website Worker. The `tv.js` player has optional registry integration: when the endpoint is configured, it queries approved alternatives after its current public playlist candidates fail and reports failures for registry-managed sources.

## Responsibilities

- Store canonical channel IDs and approved source URLs in D1.
- Return alternative source candidates for one exact channel.
- Accept playback failure reports from the player without accepting arbitrary URLs.
- Run scheduled HTTP checks every five minutes and record health history.
- Keep administrative writes behind a secret bearer token.

## Important reliability boundary

An HTTP check cannot prove a stream is watchable end-to-end, that it contains the expected channel, or that the viewer's region is allowed. Browser playback reports and real provider/EPG metadata are required for stronger confidence. This service does not discover unauthorized IPs, bypass DRM, evade geoblocking, or scrape private endpoints. Add only sources you have permission to access and distribute.

## Create and deploy

1. In Cloudflare, create a D1 database named `yocare-live-registry`.
2. Copy its database ID into `api/wrangler.jsonc`.
3. From the repository root, run `npx wrangler d1 migrations apply yocare-live-registry --remote --config api/wrangler.jsonc`.
4. Set an admin secret: `npx wrangler secret put REGISTRY_ADMIN_TOKEN --config api/wrangler.jsonc`.
5. Deploy: `npx wrangler deploy --config api/wrangler.jsonc`.
6. Add an API origin custom domain or use the Worker URL initially. Add the exact website origin to `ALLOWED_ORIGINS` (or configure `DEV_ORIGIN` for local testing).
7. In `tv.html`, set the `content` of the `meta[name="yocare-live-registry-url"]` element to the deployed registry base URL, without a trailing slash. Leave it empty until the API is deployed and CORS is configured.

The database ID is deliberately a placeholder. Do not deploy until it has been replaced with the real ID. Never commit the admin token.

## API

- `GET /api/health` — worker and database check.
- `GET /api/channels/:channelId/sources` — approved source candidates for a channel.
- `POST /api/report` — report a playback failure. Body: `{ "channel_id":"...", "source_id":"...", "reason":"network" }`.
- `POST /admin/channels` — bearer-authenticated upsert: `{ "id":"...", "name":"...", "country_code":"in" }`.
- `POST /admin/sources` — bearer-authenticated upsert: `{ "id":"...", "channel_id":"...", "url":"https://...", "source_type":"hls", "priority":10 }`.

## Current scope and next milestones

The player integration is present but opt-in: it remains disabled while the registry URL meta value is empty. Channel IDs must exactly match the stable IDs inserted in D1; the playlist's `tvg-id` is preferred, with normalized channel identity as a fallback. No production source records are seeded and no live EPG feed is configured. Next, seed and verify canonical IDs and approved feeds, deploy the API, configure CORS and the frontend meta value, then run browser-level failover tests. Add an authorized provider/EPG integration, rate limits and retention/cleanup for health logs before production.

## Security notes

- Keep the admin token server-side only.
- Admin routes require a bearer token.
- Source URLs must be HTTP(S); local/private address patterns are rejected.
- Health checks do not follow redirects, reducing redirect-based SSRF exposure.
- Add Cloudflare rate limiting and request-size limits before public production exposure.
