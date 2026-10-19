# Fight World Hunger — NGO Donation Platform

A web application that lets people discover NGOs working around the world, support them, and track the progress of their donations.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and PostgreSQL.

## Team guide

All contributors — human and AI agents — must read [`docs/TEAM_DEVELOPMENT_GUIDE.md`](docs/TEAM_DEVELOPMENT_GUIDE.md) before making changes. It defines the architecture, feature ownership, shared-file rules, database and API contracts, coding standards, and Git workflow.

Feature documentation:

- [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md) — HTTP endpoints and response envelopes.
- [`docs/FEWSNET_REGIONAL_DATA.md`](docs/FEWSNET_REGIONAL_DATA.md) — FEWS NET sub-national acute food insecurity integration (endpoints, data model, caching, attribution, limitations).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Or with Docker

```bash
docker compose up --build        # http://localhost:3000
```

See [`docs/DOCKER.md`](docs/DOCKER.md) for the dev profile, the (unused yet)
PostgreSQL service and how the LLM key is passed in without being baked into
the image.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Environment

Copy `.env.example` to `.env` and fill in the values. Never commit `.env` files.

## Map navigation

Next.js preserves cached pages using React Activity. The globe library disposes
its WebGL renderer when the map is hidden, so the map creates a fresh globe
instance when returning to the page, without requiring a full-page refresh.

The lifecycle regression tests are in
[`tests/components/WorldHungerGlobe.test.tsx`](tests/components/WorldHungerGlobe.test.tsx).
For a browser check, open `/map`, navigate to sign-in, then return using the
header link or browser Back. Repeat and confirm that the globe renders and zoom
controls work without refreshing.
