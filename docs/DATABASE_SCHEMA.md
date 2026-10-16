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

## Individual profile (proposed by Developer 3)

### IndividualProfile

One per `User`. Private to its owner.

| Field | Type | Constraints |
|---|---|---|
| `id` | string (uuid) | PK |
| `userId` | string | FK -> User, **unique** |
| `fullName` | string | required, 2-120 chars |
| `email` | string | required, valid email |
| `countryCode` | string \| null | ISO 3166-1 alpha-3 |
| `avatarUrl` | string \| null | valid URL |
| `bio` | string \| null | <= 500 chars |
| `preferredCauses` | enum `NgoCause`[] | may be empty |
| `preferredCountryCodes` | string[] | alpha-3, max 50 |
| `donateAnonymously` | boolean | default false (to be honoured by donations, Developer 4) |
| `contactConsent` | boolean | default false |
| `privacyAcceptedAt` | timestamp | required |
| `createdAt` / `updatedAt` | timestamp | required |

A user may have both an `IndividualProfile` and `NGOMembership` rows.

## Donations (proposed by Developer 4)

> **Status: PROPOSAL.** These are logical models. Until the ORM lands, they
> are persisted by the in-memory repository in
> `src/features/donations/repository.ts`. Its interface documents the
> transactional guarantees a PostgreSQL implementation must keep.

**Decisions assumed, pending the team's §16 review:**

- A donation is a **monetary pledge**. No payment is processed, and a
  donation record is not proof of payment (guide §6). If payments are added,
  model payment status separately from `status`.
- Only individual accounts donate. NGO accounts cannot.
- Status meanings:
  - `PENDING`: pledge received.
  - `CONFIRMED`: the NGO accepted it.
  - `IN_PROGRESS`: the NGO is using it.
  - `COMPLETED`: the NGO has finished using it.
  - `REJECTED`: the NGO declined it.
  - `CANCELLED`: stopped after confirmation.
- Only members of the receiving NGO change the status. Donors can't cancel
  their own donations.

### Donation

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | string (uuid) | PK | |
| `donorUserId` | string | FK → User, required | |
| `donorName` | string | required | Snapshot of the profile's `fullName` at donation time, so NGOs don't need to read private profiles |
| `ngoId` | string | FK → NGO, required | Canonical id, even when the request used the slug |
| `amountMinor` | integer | required, 100 – 100,000,000 | Minor units (cents/pence). Avoids float rounding |
| `currency` | enum `DonationCurrency` | required | `USD`, `EUR`, `GBP` (all 2 decimals) |
| `message` | string \| null | ≤ 500 chars | Donor's message to the NGO |
| `isAnonymous` | boolean | required | Defaults to `IndividualProfile.donateAnonymously`. When true, the NGO never receives `donorName` |
| `status` | enum `DonationStatus` | required, initial `PENDING` | Current status |
| `createdAt` / `updatedAt` | timestamp | required | |

**Enum `DonationStatus`:** `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`

Allowed transitions:

- `PENDING → CONFIRMED | REJECTED`
- `CONFIRMED → IN_PROGRESS | CANCELLED`
- `IN_PROGRESS → COMPLETED | CANCELLED`
- `COMPLETED`, `REJECTED`, and `CANCELLED` are terminal.

### DonationStatusHistory

An audit trail with one row per status change, including the creation.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | string (uuid) | PK | |
| `donationId` | string | FK → Donation, required | |
| `previousStatus` | enum `DonationStatus` \| null | | null for the creation entry |
| `newStatus` | enum `DonationStatus` | required | |
| `note` | string \| null | ≤ 500 chars | NGO's note to the donor, shown on the timeline |
| `changedByUserId` | string | FK → User, required | Responsible actor (never exposed by the API) |
| `changedByRole` | enum (`DONOR`, `NGO`) | required | |
| `createdAt` | timestamp | required | |

**Consistency:**

- The donation and its first history row are inserted in one transaction.
- A status change updates `Donation.status` and inserts the history row in
  one transaction, guarded by the expected current status
  (`UPDATE ... WHERE id = $1 AND status = $2`). This rejects concurrent
  conflicting updates.

### Suggested indexes

- `Donation(donorUserId, createdAt DESC)`: donor history
- `Donation(ngoId, status, createdAt DESC)`: NGO dashboard and status filter
- `DonationStatusHistory(donationId, createdAt)`: timeline
