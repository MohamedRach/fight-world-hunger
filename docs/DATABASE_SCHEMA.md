# Database Schema

> **Status: PROPOSAL — not yet agreed by the team.**
>
> This document currently contains only the NGO-profile entities proposed by
> **Developer 3**. The ORM (Prisma vs Drizzle) is still an open decision
> (see `TEAM_DEVELOPMENT_GUIDE.md` §16), so these are logical models, not
> ORM definitions. Developer 1 coordinates schema integration; Developers 1,
> 2, and 4 must review before implementation against a real database.
>
> Until the ORM lands, the NGO feature persists through an in-memory
> repository (`src/features/ngos/repository.ts`) behind an interface that a
> real implementation will replace.

## Entities proposed by Developer 3

### NGO

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | string (uuid) | PK | |
| `name` | string | required, unique, 2–120 chars | |
| `slug` | string | required, unique | URL-friendly identifier derived from name |
| `logoUrl` | string \| null | valid URL | external image URL for now (no upload infra) |
| `shortDescription` | string | required, 10–280 chars | card/teaser text |
| `mission` | string | required, 10–2000 chars | mission statement |
| `activitiesDescription` | string \| null | ≤ 5000 chars | what the NGO does |
| `targetBeneficiaries` | string \| null | ≤ 1000 chars | |
| `yearFounded` | int \| null | 1800 ≤ year ≤ current year | |
| `registrationId` | string \| null | unique when present | official registration identifier |
| `website` | string \| null | valid URL | |
| `contactEmail` | string \| null | valid email | public contact only |
| `contactPhone` | string \| null | | public phone only |
| `socialLinks` | json \| null | `{ twitter?, facebook?, instagram?, linkedin? }` all URLs | |
| `primaryCause` | enum `NgoCause` | required | see enum below |
| `otherCauses` | enum `NgoCause`[] | may be empty, excludes `primaryCause` | |
| `hqCountryCode` | string | required, ISO 3166-1 alpha-3 | `XKX` for Kosovo, matching discovery |
| `hqCity` | string \| null | | |
| `projectsSummary` | string \| null | ≤ 5000 chars | projects and initiatives |
| `impactSummary` | string \| null | ≤ 5000 chars | |
| `keyAchievements` | string[] | may be empty, each ≤ 300 chars | |
| `verificationStatus` | enum `NgoVerificationStatus` | default `PENDING` | verification process itself is an open §16 decision |
| `createdByUserId` | string | FK → User | |
| `createdAt` / `updatedAt` | timestamp | required | |

**Enum `NgoCause`:** `HUNGER_RELIEF`, `EDUCATION`, `HEALTHCARE`, `POVERTY_REDUCTION`, `CLEAN_WATER`, `DISASTER_RELIEF`, `ENVIRONMENT`, `HUMAN_RIGHTS`, `OTHER`

**Enum `NgoVerificationStatus`:** `PENDING`, `VERIFIED`, `REJECTED` — placeholder pending the team's §16 decision on NGO verification.

### NGOMembership

Associates a `User` with an `NGO` and a role. Used to authorize profile management.

| Field | Type | Constraints |
|---|---|---|
| `id` | string (uuid) | PK |
| `userId` | string | FK → User, required |
| `ngoId` | string | FK → NGO, required |
| `role` | enum `NgoMemberRole` (`OWNER`, `EDITOR`) | required |
| `createdAt` | timestamp | required |

Unique constraint on (`userId`, `ngoId`). The creator of an NGO automatically
becomes its `OWNER`.

### NGOCountry

Countries in which an NGO operates. Field requirements coordinated with
Developer 2 (map/discovery) — **pending their review**.

| Field | Type | Constraints |
|---|---|---|
| `id` | string (uuid) | PK |
| `ngoId` | string | FK → NGO, required |
| `countryCode` | string | ISO 3166-1 alpha-3, required (convention set by discovery, Developer 2) |

Unique constraint on (`ngoId`, `countryCode`). Index on `countryCode` for
"NGOs in country X" queries.

### Depends on (owned by others)

- `User` — Developer 1 (auth/foundation). The NGO feature only assumes
  `{ id: string }` plus an authenticated-session lookup.
- `Country` — Developer 2. Until it exists, the NGO feature stores ISO
  country codes and renders names from a static ISO list in
  `src/features/ngos/countries.ts`.

## Suggested indexes

- `NGO.slug` (unique), `NGO.name` (unique), `NGO.registrationId` (unique, nullable)
- `NGOMembership(userId, ngoId)` (unique), `NGOMembership.ngoId`
- `NGOCountry(ngoId, countryCode)` (unique), `NGOCountry.countryCode`
