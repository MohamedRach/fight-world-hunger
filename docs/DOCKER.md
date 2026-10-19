# Running in Docker

Files: [`Dockerfile`](../Dockerfile), [`docker-compose.yml`](../docker-compose.yml),
[`.dockerignore`](../.dockerignore).

## Quick start

```bash
# Production-style build, served on http://localhost:3000
docker compose up --build

# Different host port (3000 already taken by a local dev server, for example)
APP_PORT=3001 docker compose up --build        # PowerShell: $env:APP_PORT="3001"

# Stop and remove
docker compose down
```

The app starts with the fictional demo data from `src/mocks/` already seeded
(see `src/mocks/README.md`), so the map, campaigns and donation flows work
immediately.

## The three services

| Service | Profile | Purpose |
|---|---|---|
| `app` | *(default)* | Production build of the Next.js app |
| `dev` | `dev` | Hot-reloading `next dev` with the source bind-mounted |
| `db` | `db`, `dev` | PostgreSQL 17 — **not used yet**, wired for the future ORM |

```bash
docker compose --profile dev up        # dev server + database
docker compose --profile db up -d db   # database only
```

`db` is included because the team guide specifies PostgreSQL, but the
application still runs entirely on the in-memory mock store. Nothing reads
`DATABASE_URL` yet.

## Secrets

The LLM key is **never** baked into the image. It is read at runtime from
`.env.local` (git-ignored) through compose's `env_file`:

```dotenv
LLM_API_KEY=sk-ant-…
LLM_PROVIDER=anthropic
LLM_MODEL=claude-haiku-5-5
```

Without the file (CI, a fresh clone) the app runs normally and falls back to
deterministic recommendation ranking.

Two deliberate details:

- `.dockerignore` excludes `.env` and `.env.*` (except `.env.example`), so no
  real environment file can end up in a layer.
- The LLM variables are **not** repeated under `environment:` in
  `docker-compose.yml`. A key listed there wins over `env_file`, so an unset
  shell variable would silently blank out the value from the file.

Verify a running container:

```bash
docker compose exec app printenv | grep LLM_PROVIDER
```

## Image details

- Multi-stage build: `deps` → `builder` → `runner`.
- Uses Next.js `output: "standalone"` (set in `next.config.ts`), so the runtime
  image ships only the modules the server imports. Result: **343 MB**.
- Runs as the unprivileged `node` user (uid 1000), not root.
- `CMD ["node", "server.js"]` with no shell, so `SIGTERM` from
  `docker compose down` reaches Node directly.
- `public/` is copied explicitly: it serves the country boundaries and
  `src/features/geography/server/iso-codes.ts` reads that GeoJSON from disk.
- The build prerenders `/map`, which fetches the FAO/World Bank hunger data.
  Offline builds fall back to the committed snapshot, so the build still works
  without network access. No secret is required at build time.

## Health check

`app` is healthy once `/api/countries/KEN/campaigns` answers:

```bash
docker compose ps          # look for "(healthy)"
docker compose logs -f app
```

## Verified (October 2026)

Built and run on Docker 28.5.1 / Compose v2.40.2:

- image built, container reported `healthy`, running as uid 1000;
- `/map` returned 200 and the WebGL globe rendered (1140×598 canvas);
- `/data/countries-110m.geojson` served (234 KB);
- `/api/countries/KEN/campaigns` returned the 4 seeded Kenya campaigns with
  their issue tags;
- signed-in donor received `source: "llm"` recommendations from the real
  provider, using the key supplied via `.env.local`;
- `grep -r 'sk-ant-' /app` inside the image found nothing.

## Troubleshooting

**`ports are not available: ... 0.0.0.0:3000`** — something already listens on
3000 (often a local `npm run dev`). Use `APP_PORT=3001`.

**`error during connect: ... dockerDesktopLinuxEngine`** — Docker Desktop is
installed but not running. Start it and wait for the engine.

**Recommendations always say `fallback`** — the key did not reach the
container. Check `docker compose exec app printenv | grep LLM_API_KEY` and
confirm `.env.local` sits next to `docker-compose.yml`.

**Changes not picked up** — the `app` service runs a build artefact. Rebuild
with `docker compose up --build`, or use `docker compose --profile dev up`.

## Azure deployment

The Docker Compose-built production image is deployed to Azure Container Apps:

- Resource group: `CASA-team-6` (Germany West Central).
- Existing environment: `fwh-env`.
- App: `fight-world-hunger`.
- URL: <https://fight-world-hunger.greensmoke-8b6e5343.germanywestcentral.azurecontainerapps.io/map>.
- Private Basic registry: `casateam6fwh7a66.azurecr.io`.
- Initial image tag: `20261017-1030`.
- Recommendation workflow UI update: `20261017-agent-loading`.

Compose builds the image locally; Azure runs the same image without requiring
a VM or a Compose installation. The app listens on port 3000 behind Azure's
HTTPS ingress. It uses 0.5 vCPU and 1 GiB RAM, with exactly one replica to avoid
splitting the current in-memory demo store between instances. Keeping one
replica running and keeping the registry both incur Azure charges.

### Deploy an update (PowerShell)

Run from the repository root after `az login`. Each native command is checked
so a failed build or push cannot deploy an older image accidentally.

```powershell
$registry = "casateam6fwh7a66.azurecr.io"
$tag = Get-Date -Format "yyyyMMdd-HHmmss"
$image = "${registry}/fight-world-hunger:${tag}"

docker compose build app
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

az acr login --name casateam6fwh7a66
if ($LASTEXITCODE -ne 0) { throw "Registry login failed" }

docker tag fight-world-hunger:latest $image
if ($LASTEXITCODE -ne 0) { throw "Image tagging failed" }

docker push $image
if ($LASTEXITCODE -ne 0) { throw "Image push failed" }

az containerapp update --name fight-world-hunger `
  --resource-group CASA-team-6 --image $image --output none
if ($LASTEXITCODE -ne 0) { throw "Azure deployment failed" }

Invoke-WebRequest -UseBasicParsing `
  "https://fight-world-hunger.greensmoke-8b6e5343.germanywestcentral.azurecontainerapps.io/api/countries/KEN/campaigns"
```

### Registry access and runtime configuration

The registry admin account and anonymous access are disabled. The current
Azure user could not create role assignments, so the app pulls images using
the `fwh-pull` registry token, restricted to `content/read` and `metadata/read`
on the `fight-world-hunger` repository. Its password is stored as a Container
Apps secret, never in these files. The initial password expires after 365
days; rotate it and update the app's registry credentials before expiry.
An administrator can replace this token with managed identity and `AcrPull`
later.

No local environment files or LLM credentials were uploaded. Recommendations
use deterministic fallback ranking until an authorized operator configures
the provider and key through Azure runtime settings/secrets. Do not put keys
in image layers, documentation, or command output.

This is a **demo deployment**, not durable production storage: accounts,
campaign changes, and donations are in memory and are lost on restart or
redeployment. The optional Compose PostgreSQL service is not deployed because
the application does not use it yet.

Deployment verification: production Docker build and TypeScript check passed;
the local container ran as uid 1000; live HTTPS requests to `/map`,
`/data/countries-110m.geojson`, `/api/countries/KEN/campaigns`, and `/sign-in`
returned HTTP 200. Azure reported a running app and a ready revision.
The deployed globe rendered in a browser, continued drawing after navigating
to sign-in and returning with Back, and accepted the zoom-in control.
