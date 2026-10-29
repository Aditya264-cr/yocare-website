# Yocare Live source registry

The registry is the playback source of truth for Yocare Live. Public IPTV-org playlists provide channel names, logos, and categories only; the browser does not play their unverified URLs. Playback candidates must be added by an administrator with a documented distribution-rights reference and permitted territories.

## Delivery path

1. A broadcaster or distributor supplies a feed Yocare is allowed to distribute.
2. Use its HTTPS HLS/DASH feed directly when it supports browser playback, or ingest an authorized contribution feed through a streaming provider.
3. Register the resulting playback manifest and each authorized redundant feed. The API returns only sources licensed for the viewer's Cloudflare edge country.
4. A five-minute monitor checks HTTPS, redirects, browser CORS, and HLS manifest/first-segment reachability. The player tries authorized alternatives in priority/health order and reports playback failures.
5. Browser playback remains the final check for decoding, audio, and regional/provider behavior. Health status is evidence, not an uptime promise.

No production source records are seeded. A channel without an authorized feed in the viewer's territory will show an unavailable message and can be watched through the broadcaster's official service.

## Feed and ingestion options

- **Authorized HLS/DASH:** register the broadcaster's stable HTTPS playback manifest. It must allow browser playback from Yocare and must not depend on cookies or custom request headers.
- **RTMPS/SRT contribution:** Cloudflare Stream Live accepts authorized broadcaster contributions over RTMPS or SRT, encodes the video, and provides HLS/DASH playback. Create a Live Input in Cloudflare, give the ingest URL/key only to the broadcaster, and register the resulting HLS manifest in Yocare. Stream Live is a paid delivery service; channels can be free to viewers while still having operating costs. See [Cloudflare Stream Live](https://developers.cloudflare.com/stream/stream-live/) and [watch a live input](https://developers.cloudflare.com/stream/stream-live/watch-live-stream/).
- **HLS pull/transcoding:** when a distributor grants a pull feed that needs normalization, a managed encoder/packager such as AWS Elemental MediaLive can ingest supported live inputs and produce viewer-ready outputs. This requires an account, output origin/CDN, and distribution rights.
- **Official app or embed:** when a broadcaster only authorizes viewing on its own service, link viewers there. An official YouTube stream can be embedded only when the owner enables embedding and YouTube's player/API terms are followed; it is not a transferable HLS feed. See the [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

NASA+ is an example of free, official live and on-demand programming for viewers. Its [ways to watch page](https://www.nasa.gov/ways-to-watch/) is a destination, not a Yocare redistribution license or feed URL. FAST distributors and channel owners can be approached for free/ad-supported carriage, but Yocare needs approval for each distribution and territory. Subscription networks such as Disney Channel require the relevant broadcaster/distributor agreement; an IPTV-org listing cannot provide that authorization.

## Deploy the registry

The website and registry are separate Cloudflare Workers.

1. Apply database migrations: npx wrangler d1 migrations apply yocare-live-registry --remote --config api/wrangler.jsonc.
2. Set the admin secret with wrangler secret put REGISTRY_ADMIN_TOKEN --config api/wrangler.jsonc.
3. Deploy the API with npx wrangler deploy --config api/wrangler.jsonc.
4. Confirm public/index.html points to this Worker and ALLOWED_ORIGINS includes the exact website origin.
5. Confirm the source host returns Access-Control-Allow-Origin for https://yocare.online (or *), on the manifest and HLS media requests.

For local development, set DEV_ORIGIN and DEV_COUNTRY on the Worker. Production uses Cloudflare's request country; it never trusts a country selected by the browser for license filtering.

## API

- GET /api/health — Worker/database status.
- GET /api/channels/:channelId/sources — authorized feeds available in the request's Cloudflare country.
- POST /api/report — browser playback failure for a registry-managed source.
- POST /admin/channels — bearer-authenticated channel upsert.
- POST /admin/sources — bearer-authenticated feed upsert. Requires authorization_reference, rights_regions (ISO alpha-2 codes or * only for explicitly worldwide rights), and optional future rights_expires_at.
- POST /admin/sources/:sourceId/disable — immediately disable/revoke a source.

Example source registration:

~~~json
{
  "id": "sample-primary",
  "channel_id": "sample-channel@in",
  "url": "https://media.example.org/live/master.m3u8",
  "source_type": "hls",
  "priority": 10,
  "authorization_reference": "internal-rights-record-2026-001",
  "rights_regions": ["IN"],
  "rights_expires_at": "2027-12-31T23:59:59Z"
}
~~~

Use a non-secret internal reference. Do not put contracts, broadcaster passwords, API keys, cookies, or short-lived signed URLs in the public registry; source URLs are returned to viewers' browsers.

## Reliability and security limits

- Playback URLs must use HTTPS. Private-address hosts and unsafe redirects are rejected.
- The HLS monitor checks CORS, the root/variant manifest, and one media segment. DASH checks its manifest; the browser still has to prove playback. Encrypted/DRM feeds, custom-header feeds, cookie-gated feeds, and DRM keys need a provider-authorized integration.
- Health is polled every five minutes in bounded batches. Viewers can still encounter ISP outages, device codec differences, blackouts, or provider restrictions.
- The player never falls back to raw IPTV-org URLs. Existing/unverified entries are hidden from registry results because the migration leaves their rights reference empty.
- Apply api/migrations/0002_authorized_delivery.sql before deploying this API version. Do not commit the admin token.
