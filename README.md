<div align="center">

<img src="public/<img width="1536" height="380" alt="yocare logo" src="https://github.com/user-attachments/assets/a4ef1756-f4ef-4bdd-99b0-0091a5a555da" />
" alt="Yocare logo" width="88" height="88" />

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
- **Yocare Tools** — a planned collection of practical digital utilities. Its public page currently introduces the product and communicates that it is coming soon.

## The Yocare ecosystem

| Product | Purpose | Status |
| --- | --- | --- |
| **Yocare Home** | Introduces Yocare and connects visitors to its products. | Live |
| **Yocare Live** | Explore regional TV channel catalogues, watch eligible live streams and discover YouTube videos. | In development |
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

Copy `.env.example` to `.env.local` and add your YouTube API key:

~~~bash
cp .env.example .env.local
~~~

~~~dotenv
VITE_YOUTUBE_API_KEY=your_youtube_data_api_v3_key
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

## License

No explicit open-source license has been established for this repository. Unless a license is added, all rights are reserved by the repository owner. Third-party libraries, APIs, logos, channel metadata and media remain subject to their respective owners' terms and licenses.

---

<div align="center">

**Yocare — A growing home for digital experiences.**

[Website](https://yocare.online) · [GitHub repository](https://github.com/Aditya264-cr/yocare-website)

</div>
