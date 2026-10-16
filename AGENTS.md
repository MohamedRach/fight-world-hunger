# Agent Instructions — NGO Donation Platform

This repository is developed by a team of four developers, each assisted by an AI coding agent.

**Before making any change, read [`docs/TEAM_DEVELOPMENT_GUIDE.md`](docs/TEAM_DEVELOPMENT_GUIDE.md) in full.** It is the single source of truth for architecture, feature ownership, shared-file rules, database and API contracts, coding standards, Git workflow, and the rules every agent must follow (see section 11).

## Quick rules

1. Inspect the existing project structure before creating files.
2. Work only within the feature area you were assigned; do not modify another developer's feature.
3. Do not change shared schemas, API contracts, global configuration (`package.json`, `src/app/layout.tsx`, `src/lib/db.ts`, auth config, Tailwind/global CSS), or dependencies without approval.
4. Reuse existing components, types, validation utilities, and database conventions. Never create duplicate DB clients, auth systems, or shared utilities.
5. Do not invent fields or endpoint contracts; consult `docs/API_CONTRACTS.md` and `docs/DATABASE_SCHEMA.md` once they exist.
6. If a required decision is missing or conflicts with the existing implementation, stop and ask rather than guessing (see guide section 16 for open decisions).
7. Run lint, type checks, and relevant tests, then report files changed, checks performed, and unresolved issues. Do not claim something works without having checked it.

## Project commands

```bash
npm run dev     # start the development server
npm run build   # production build (also type-checks)
npm run lint    # eslint
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
