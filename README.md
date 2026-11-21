<div align="center">

<img width="1536" height="380" alt="yocare logo" src="https://github.com/user-attachments/assets/a4ef1756-f4ef-4bdd-99b0-0091a5a555da" />


# Yocare

### A connected home for thoughtful digital experiences.

Discover entertainment with **Yocare Live** and look ahead to practical everyday utilities with **Yocare Tools** — brought together under one growing digital ecosystem.

[🌐 Visit Yocare](https://yocare.online) · [📺 Yocare Live](https://yocare.online/live) · [🧰 Yocare Tools](https://yocare.online/tools)

[![Deploy website](https://github.com/Aditya264-cr/yocare-website/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/Aditya264-cr/yocare-website/actions/workflows/deploy-cloudflare.yml)
[![Validate application](https://github.com/Aditya264-cr/yocare-website/actions/workflows/validate-live.yml/badge.svg)](https://github.com/Aditya264-cr/yocare-website/actions/workflows/validate-live.yml)

</div>

---

## About the project

**Yocare** is an independent digital ecosystem being built around a simple idea: technology should feel clear, useful and human.

Rather than putting unrelated experiences together, Yocare brings focused products under one recognisable identity. The central website introduces the ecosystem and provides a home for its products. Each product has its own experience while sharing the Yocare brand.

The project currently brings together:

- **Yocare Home** — the central website and entry point to the ecosystem.
- **Yocare Live** — an entertainment experience combining live television discovery, channel browsing and video discovery.
- **Yocare Movies & Series** — a movie and television discovery experience with title search, trending catalogues, details and regional streaming-provider availability.
- **Yocare Tools** — a planned collection of practical digital utilities. Its public page currently introduces the product and communicates that it is coming soon.

## The Yocare ecosystem

| Product | Purpose | Status |
| --- | --- | --- |
| **Yocare Home** | Introduces Yocare and connects visitors to its products. | Live |
| **Yocare Live** | Explore regional TV channel catalogues, watch eligible live streams and discover YouTube videos. | In development |
| **Yocare Movies & Series** | Search movie and series metadata, explore popular titles and find reported provider availability by region. | Initial implementation |
| **Yocare Tools** | A future collection of useful digital tools for everyday tasks. | Coming soon |

### Yocare Home

The main website is the front door to the ecosystem. It features the Yocare identity, product navigation, a product showcase and an introduction to the thinking behind the brand.

### Yocare Live

Yocare Live is the entertainment product. Its current experience includes:

- Country-aware channel discovery and browsing.
- Channel categories, search, channel artwork and programme-oriented sections.
- A custom HTML5 player built with **hls.js** and **dash.js** for supported HLS and MPEG-DASH streams.
- Stream selection with authorised alternative sources where available.
- YouTube trending, live-video and search discovery, with category and regional context.
- An experimental AI-assisted live-stream discovery interface.
- An additional wellbeing workspace prototype.

**Important about live TV sources:** a channel catalogue entry is not proof that Yocare has permission to redistribute that channel. Public IPTV-org data is used for channel metadata and discovery; production playback is designed to resolve through Yocare's separate source registry. The registry only returns sources with verified authorisation for the viewer's territory. No production source records are seeded by default, so some channels may not be playable. Availability also depends on the broadcaster, territory, provider, browser and network.

### Yocare Tools

Yocare Tools is planned as a collection of practical digital utilities. The current page is a coming-soon experience; individual tools have not yet been announced as available.

### Yocare Movies & Series

The Movies & Series experience uses TMDB for catalogue search, trending titles, posters, title details and regional watch-provider availability. The Yocare Search Agent searches matching movie and series metadata, then checks streaming, rental and purchase availability for the selected region. It presents provider categories and links to the official TMDB/JustWatch watch-options page; provider names are not treated as direct playback links. The Yocare Browser accepts a selected title from the movie detail page and opens the configured source homepage (default: `https://net77.cc/home`) with the title carried into the browser handoff. This is a navigation handoff only: cross-origin browser isolation means the frontend does not automatically submit forms inside arbitrary third-party pages, inspect protected player internals or extract media streams. Sites that permit embedding can appear in the browser frame; sites that block embedding must be opened in their own tab. The Yocare Playback Orchestrator is the unified viewing workflow opened by **Play in Yocare** from a movie or series detail page. It checks Yocare's server-side playback resolver first, then displays regional provider availability and official watch options when an authorized in-app session is not available. The in-app player accepts only a resolver response that confirms rights and supplies an HTTPS playback URL. The orchestrator does not extract third-party streams or bypass provider restrictions. The production build expects a GitHub Actions secret named `VITE_TMDB_API_KEY`; add a TMDB API key in the repository's Actions secrets before deployment. The key is embedded in the client bundle because this is a browser-side integration, so configure usage restrictions and monitor its use. TMDB attribution is displayed in the product. The title detail view now offers hybrid playback: it first calls an optional Yocare playback resolver and opens the in-app HLS player only when the resolver returns `rightsVerified: true` and an HTTPS `playbackUrl`; otherwise it falls back to TMDB's regional watch-options link. The website Worker now owns `/api/movies/playback` and returns an explicit JSON `503 playback_not_configured` response until a licensed distributor integration is connected. This prevents the SPA fallback from returning HTML to the player UI. To enable actual in-app playback, connect a licensed distributor through a server-side resolver and configure the website Worker variables described below. The optional frontend variable `VITE_YOCARE_MOVIE_PLAYBACK_API_URL` only changes which Yocare API endpoint the browser calls (it defaults to `/api/movies/playback`); it is not the distributor endpoint and must never contain provider credentials. The Worker-side resolver must verify the title, viewer territory, entitlement and current distribution rights server-side before returning a short-lived stream URL. Never return arbitrary user-supplied URLs or expose provider credentials in the browser. A resolver response must be JSON shaped as `{ "rightsVerified": true, "playbackUrl": "https://..." }`. The in-app player supports HLS streams through hls.js or native browser HLS.

### Connecting an authorised movie playback provider

The website Worker exposes a server-side adapter at `/api/movies/playback`. It does not scrape websites or discover arbitrary media URLs. To activate in-app playback, Yocare must first have a distributor integration that is permitted to create playback sessions for the requested title, territory and viewer.

Configure these Cloudflare Worker settings for the **website Worker**:

- `MOVIE_PLAYBACK_RESOLVER_URL` — HTTPS endpoint operated by the authorised distributor or Yocare's trusted integration service.
- `MOVIE_PLAYBACK_RESOLVER_TOKEN` — secret bearer token for that endpoint. Set it as a Worker secret, never as a Vite variable.
- `MOVIE_PLAYBACK_ALLOWED_HOSTS` — comma-separated exact hostnames from which that provider issues playback URLs. Use only hostnames confirmed by the provider.

Example Wrangler commands (run from the repository root after authenticating Wrangler):

```bash
bunx wrangler secret put MOVIE_PLAYBACK_RESOLVER_TOKEN
bunx wrangler secret put MOVIE_PLAYBACK_RESOLVER_URL
bunx wrangler secret put MOVIE_PLAYBACK_ALLOWED_HOSTS
```

The resolver receives a server-to-server JSON POST body:

```json
{ "tmdbId": "123", "mediaType": "movie", "region": "IN" }
```

It must validate current distribution rights, viewer entitlement and territory itself. If playback is permitted, it returns JSON containing `rightsVerified: true` and a short-lived HTTPS `playbackUrl`. The Worker accepts that URL only when its hostname exactly matches the configured allowlist. If no permitted session exists, return `rightsVerified: false` and an optional user-safe `message`. Provider credentials and entitlement tokens must never be sent to the browser.

This is an integration adapter, not a connected content provider. Until a real authorised resolver endpoint, secret and provider-approved playback hosts are configured, the API intentionally returns `503 playback_not_configured`; the player will not invent or extract a stream. The adapter currently expects a provider to return a browser-playable HLS URL. Confirm the provider's playback, embedding, CORS and DRM requirements before enabling a title.

### Yocare Browser source handoff

The movie detail page includes **Open source browser with this title**. It opens `/movies/browser` with the selected title and source URL. The default source homepage is `https://net77.cc/home`; deployments can override it with the Vite build variable `VITE_YOCARE_BROWSER_HOME_URL`. This feature carries the selected title and opens the source page, but does not automate third-party search forms or access protected media. A source-specific automation integration requires a documented, authorised interface and must respect the source's playback, embedding and access controls.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript |
| Build tooling | Vite |
| Styling | Tailwind CSS 4 and project-specific CSS |
| Icons | Lucide React |
| HLS playback | hls.js |
| MPEG-DASH playback | dash.js |
| Video discovery | YouTube Data API v3 |
| AI-assisted discovery prototype | Google Gemini via the Google GenAI SDK |
| Source registry API | Cloudflare Workers |
| Registry database | Cloudflare D1 |
| Hosting and delivery | Cloudflare Workers Static Assets |
| CI/CD | GitHub Actions |

## Application routes

The website is a single-page application with path-based product entry points:

| Route | Experience |
| --- | --- |
| `/` | Yocare Home |
| `/live` | Yocare Live |
| `/movies` | Yocare Movies & Series |
| `/movies/agent` | Yocare Search Agent — search titles and compare regional provider availability |
| `/movies/browser` | Yocare Browser — browse websites that permit embedding, with external-tab fallback |
| `/movies/play` | Yocare Playback Orchestrator — resolve permitted playback sessions and present provider fallback options |
| `/tools` | Yocare Tools — coming soon |

The root Cloudflare Worker serves the built frontend from `dist/` and uses single-page-application fallback handling.

## Project structure

~~~text
yocare-website/
├── .github/
│   └── workflows/
│       ├── deploy-cloudflare.yml      # Website build and deployment
│       ├── deploy-registry.yml        # Manual source-registry deployment
│       └── validate-live.yml          # Pull-request build validation
├── api/
│   ├── migrations/                    # Cloudflare D1 schema migrations
│   ├── src/
│   │   ├── index.js                   # Source registry Worker
│   │   └── source-probe.mjs           # Stream health and URL checks
│   ├── tests/                         # Registry and probe tests
│   ├── README.md                      # Registry operations and rights policy
│   └── wrangler.jsonc                 # Registry Worker configuration
├── public/
│   ├── data/                          # Public application data
│   └── yocare-logo.png                # Supplied Yocare brand mark
├── scripts/
│   └── deploy-with-retry.mjs          # Website deployment retry helper
├── src/
│   ├── components/                    # Shared and product UI components
│   ├── services/                      # Channel and video data services
│   ├── App.tsx                        # Path-based product routing
│   ├── LiveApp.tsx                    # Yocare Live application
│   ├── main.tsx                       # Frontend entry point
│   ├── types.ts                       # Shared TypeScript types
│   ├── yocare-home.css                # Yocare Home and Tools styling
│   └── yocare-tv.css                  # Yocare Live styling
├── index.html
├── package.json
├── vite.config.ts
└── wrangler.jsonc                     # Website Worker configuration
~~~

## Run locally

### Requirements

- [Bun](https://bun.sh/) (used by the repository workflows).
- A recent version of Node.js for compatible tooling.
- A YouTube Data API v3 key if you want to test YouTube discovery.

### 1. Clone the repository

~~~bash
git clone https://github.com/Aditya264-cr/yocare-website.git
cd yocare-website
~~~

### 2. Install dependencies

~~~bash
bun install
~~~

For a clean, lockfile-respecting installation:

~~~bash
bun install --frozen-lockfile
~~~

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and add the API keys and optional browser homepage needed for local development:

~~~bash
cp .env.example .env.local
~~~

~~~dotenv
VITE_YOUTUBE_API_KEY=your_youtube_data_api_v3_key
VITE_TMDB_API_KEY=your_tmdb_api_key
# Optional: override the source landing page for the browser handoff
VITE_YOCARE_BROWSER_HOME_URL=https://net77.cc/home
~~~

The key is used by the browser application, so restrict it in Google Cloud Console to the YouTube Data API v3 and the appropriate website referrers. Do not commit real keys or other secrets.

### 4. Start the development server

~~~bash
bun run dev
~~~

Open [http://localhost:3000](http://localhost:3000).

### 5. Create a production build

~~~bash
bun run build
~~~

The production frontend is generated in `dist/`.

## Live source registry

Yocare Live uses a separate Cloudflare Worker and D1 database for authorised playback-source management. This is intentionally separate from the public channel catalogue.

The registry is responsible for:

- Returning enabled sources that have a verified rights reference.
- Filtering playback sources using the viewer's Cloudflare edge country.
- Prioritising sources using recent health checks, latency and reliability information.
- Checking registered sources on a scheduled five-minute interval.
- Rewriting and proxying authorised HLS manifests and their media requests through a controlled same-host path.
- Accepting browser playback-failure reports.
- Allowing authenticated administrators to register, update or disable channel sources.

A source registration requires a non-secret authorisation reference and permitted territories. Do not register a feed unless the relevant distribution rights have been obtained. Do not commit broadcaster credentials, API keys, contracts, cookies or temporary signed URLs.

For registry setup, API routes, migrations, deployment steps and operational details, see **[api/README.md](api/README.md)**.

## Deployment

The project uses separate Cloudflare Workers for the website and the live source registry.

### Website deployment

Every push to `main` triggers the website deployment workflow:

1. Install the locked Bun dependencies.
2. Type-check and build the frontend.
3. Deploy the generated website assets to Cloudflare.

The workflow is defined in [deploy-cloudflare.yml](.github/workflows/deploy-cloudflare.yml).

Configure these GitHub Actions repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_YOUTUBE_API_KEY` (needed for the YouTube discovery build)
- `VITE_TMDB_API_KEY` (needed for the Movies & Series catalogue and provider availability)

### Registry deployment

The source-registry deployment is a separate manual workflow. It applies D1 migrations, configures the registry admin token, deploys the Worker and checks its health endpoint.

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `REGISTRY_ADMIN_TOKEN`

See [deploy-registry.yml](.github/workflows/deploy-registry.yml) and the [registry operations guide](api/README.md) before deploying.

### Validation

Pull requests targeting `main` run the application build and TypeScript validation through [validate-live.yml](.github/workflows/validate-live.yml).

## Brand direction

Yocare's visual identity is intentionally minimal and timeless:

- The supplied gradient **Y** mark is the primary symbol.
- A rounded-square logo treatment with a subtle shadow is used where the mark needs a contained app-style presentation.
- Green, teal and cyan gradients provide a restrained accent across the ecosystem.
- Product experiences share a clear typographic hierarchy, considered spacing and simple navigation.

Please preserve the supplied logo artwork and the shared visual language when contributing UI changes.

## Responsible use and content rights

Yocare aims to make discovery easier while respecting content owners and distribution restrictions.

- Channel metadata and a publicly listed stream URL do not establish redistribution rights.
- Only sources with documented authorisation and territory permissions should be added to the production registry.
- Rights may differ by country and may expire; sources must be disabled when authorisation ends.
- Health checks are technical signals, not a guarantee that a stream will play on every device or network.
- When a channel is not authorised or available through Yocare, direct viewers to the broadcaster's official service where possible.
- Follow the terms and policies of third-party services and APIs, including YouTube and Google.

## Contributing

Contributions that improve accessibility, reliability, performance, documentation, maintainability and the overall user experience are welcome.

Before opening a pull request:

1. Keep changes focused and explain the problem they solve.
2. Follow the existing React and TypeScript patterns.
3. Preserve the Yocare design system and responsive behaviour.
4. Never add unlicensed stream sources or secrets.
5. Run `bun run build` and describe any checks you could not run.
6. Update relevant documentation when behaviour or setup changes.

## License and intellectual property

Yocare-owned original materials first published with the current root `LICENSE` are marked proprietary: all rights are reserved unless the applicable copyright owner grants written permission.

**Important historical licensing note:** earlier public versions of this repository carried the Unlicense at the root. Replacing that file does not revoke permissions already granted to people who received earlier versions under the Unlicense. This change is prospective and does not make previously released copies proprietary retroactively. Obtain qualified legal advice before relying on exclusive rights in material published under the earlier notice.

The `iptv-source/` directory is third-party upstream material and retains its own Unlicense. Dependencies, external assets, trademarks, channel metadata, and media remain subject to their respective owners' licences and rights. See [NOTICE.md](NOTICE.md) for the third-party material boundary.

Contributions do not automatically transfer copyright to Yocare. Contributor ownership and permissions should be agreed in writing before accepting substantial external contributions.
---

<div align="center">

**Yocare — A growing home for digital experiences.**

[Website](https://yocare.online) · [GitHub repository](https://github.com/Aditya264-cr/yocare-website)

</div>
