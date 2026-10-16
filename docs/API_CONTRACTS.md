# API Contracts

> **Status: PROPOSAL — not yet agreed by the team.**
>
> Only the NGO-profile endpoints (Developer 3) are documented so far.
> Other owners add their endpoints here as they are designed.
> Authentication is not yet implemented (Developer 1); these contracts
> specify the intended auth behavior, currently enforced against a
> temporary session stub (see "Authentication note" below).

## Conventions

- All responses are JSON.
- Success: `{ "data": ... }`
- Error: `{ "error": { "code": string, "message": string, "fieldErrors"?: Record<string, string[]> } }`
- Status codes: `200` OK, `201` created, `400` validation error, `401`
  unauthenticated, `403` forbidden, `404` not found, `409` conflict.

## Authentication note (temporary)

Until Developer 1's auth lands, handlers resolve the current user via
`src/features/ngos/session.ts` (`getSessionUser()`), which reads a dev-only
`x-dev-user-id` header outside production. This file is a **stub to be
replaced** by the shared auth helper; the authorization logic itself
(membership checks) is real and server-side.

---

## GET `/api/ngos/:ngoId`

Retrieve a public NGO profile. `:ngoId` may be the NGO `id` or its `slug`.

- **Auth:** none (public).
- **Response 200:** `{ "data": NgoPublicProfile }`

```ts
type NgoPublicProfile = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  shortDescription: string;
  mission: string;
  activitiesDescription: string | null;
  targetBeneficiaries: string | null;
  yearFounded: number | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  socialLinks: { twitter?: string; facebook?: string; instagram?: string; linkedin?: string } | null;
  primaryCause: NgoCause;
  otherCauses: NgoCause[];
  hqCountryCode: string;
  hqCity: string | null;
  operatingCountryCodes: string[];
  projectsSummary: string | null;
  impactSummary: string | null;
  keyAchievements: string[];
};
```

- **Errors:** `404 NOT_FOUND` when no NGO matches.
- **Privacy:** `registrationId`, `verificationStatus`, `createdByUserId`,
  and membership data are **never** returned publicly.

## POST `/api/ngos`

Create an NGO profile. The creator becomes the NGO's `OWNER` member.

- **Auth:** required (authenticated user).
- **Body:** `NgoCreateInput` — same fields as `NgoPublicProfile` minus
  `id`, `slug`, `operatingCountryCodes` replaced by required
  `operatingCountryCodes: string[]` (min 1), plus optional
  `registrationId`. Validation rules in `src/features/ngos/validation.ts`
  (Zod) and `docs/DATABASE_SCHEMA.md`.
- **Response 201:** `{ "data": NgoPublicProfile }`
- **Errors:**
  - `400 VALIDATION_ERROR` with `fieldErrors`.
  - `401 UNAUTHENTICATED`.
  - `409 DUPLICATE_NGO` when `name` or `registrationId` already exists.

## PATCH `/api/ngos/:ngoId`

Update an NGO profile. Partial update; only provided fields change.

- **Auth:** required. Caller must hold an `OWNER` or `EDITOR`
  `NGOMembership` for this NGO — checked server-side.
- **Body:** `NgoUpdateInput` — any subset of `NgoCreateInput` fields.
  Immutable via this endpoint: `id`, `slug`, `verificationStatus`,
  `createdByUserId`.
- **Response 200:** `{ "data": NgoPublicProfile }`
- **Errors:**
  - `400 VALIDATION_ERROR`
  - `401 UNAUTHENTICATED`
  - `403 FORBIDDEN` (no membership for this NGO)
  - `404 NOT_FOUND`
  - `409 DUPLICATE_NGO` (name/registrationId collision)

---

## Individual profile (Developer 3)

The signed-in user's own profile. **Private:** there is no endpoint to read
another person's profile, and NGOs cannot browse individuals.

```ts
type IndividualProfileView = {
  id: string;
  fullName: string;
  email: string;
  countryCode: string | null;          // ISO 3166-1 alpha-3
  avatarUrl: string | null;
  bio: string | null;                  // <= 500 chars
  preferredCauses: NgoCause[];
  preferredCountryCodes: string[];     // alpha-3, max 50
  donateAnonymously: boolean;
  contactConsent: boolean;
};
```

### GET `/api/me/individual-profile`
- **Auth:** required. **200** `{ data: IndividualProfileView }`
- **Errors:** `401 UNAUTHENTICATED`, `404 NOT_FOUND` (no profile yet)

### POST `/api/me/individual-profile`
- **Auth:** required. One profile per account.
- **Body:** `fullName`, `email` (required), optional fields above, and
  `acceptPrivacyPolicy: true` (required; stored as an acceptance timestamp).
- **201** `{ data: IndividualProfileView }`
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `409 PROFILE_EXISTS`

### PATCH `/api/me/individual-profile`
- **Auth:** required. Partial update; omitted fields are unchanged.
- **200** `{ data: IndividualProfileView }`
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 NOT_FOUND`

## GET `/api/me/ngos` (Developer 3)

NGOs the signed-in user manages (owner or editor). Used by NGO sign-in to
decide between the dashboard and NGO registration.

- **Auth:** required. **200** `{ data: Array<{ id: string; name: string; slug: string }> }`
  (empty array when the account has no NGO).
- **Errors:** `401 UNAUTHENTICATED`

## Sign-in (temporary)

`/sign-in?as=individual|ngo[&next=/path]` is a development-only sign-in
(email, no password) that sets the session stub's cookie. One account can
hold an individual profile **and** NGO memberships. `next` accepts same-site
paths only. To be replaced by Developer 1's authentication.

---

## Donations (Developer 4)

> **Status: PROPOSAL.** It is based on the defaults suggested in
> `TEAM_DEVELOPMENT_GUIDE.md` §8, pending the team's §16 decisions. A
> donation is a **monetary pledge**: no payment is processed (§1.3). Handlers
> resolve the user with `getSessionUser()` (temporary accounts). Business
> rules live in `src/features/donations/service.ts`.

```ts
type DonationStatus =
  "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "CANCELLED";
type DonationCurrency = "USD" | "EUR" | "GBP";

type DonationView = {
  id: string;
  ngo: { id: string; slug: string; name: string };
  amount: number;                 // major units, at most 2 decimals (e.g. 19.99)
  currency: DonationCurrency;
  message: string | null;         // donor's message to the NGO
  isAnonymous: boolean;
  donorName: string | null;       // null when an NGO views an anonymous donation
  status: DonationStatus;
  createdAt: string;              // ISO 8601
  updatedAt: string;
};

type DonationDetail = DonationView & {
  history: Array<{
    id: string;
    previousStatus: DonationStatus | null;  // null = donation created
    newStatus: DonationStatus;
    note: string | null;
    actor: "DONOR" | "NGO";                 // user ids are never exposed
    createdAt: string;
  }>;                                       // oldest first
  viewerRole: "DONOR" | "NGO";
  allowedNextStatuses: DonationStatus[];    // empty for donors
};
```

**Visibility:** a donation is visible only to its donor and to members
(`OWNER`/`EDITOR`) of the receiving NGO. Anyone else gets `404 NOT_FOUND`,
which does not reveal whether the donation exists.

### POST `/api/donations`

- **Auth:** required, **individual accounts only** (`403 FORBIDDEN` for NGO accounts).
- **Body:** `{ ngoId: string; amount: number; currency: DonationCurrency; message?: string | null; isAnonymous?: boolean }`
  - `ngoId`: an NGO id or slug.
  - `amount`: a JSON number from 1 to 1,000,000 with at most 2 decimals. It is stored in minor units.
  - `message`: at most 500 characters. Blank becomes `null`.
  - `isAnonymous`: defaults to the donor's `donateAnonymously` profile preference.
  - Unknown fields, such as `status` or `donorUserId`, are rejected.
- **201** `{ data: DonationDetail }`. The status is always `PENDING`, and one
  history entry records the creation.
- **Errors:** `400 VALIDATION_ERROR` (with `fieldErrors`; an unknown NGO gives `fieldErrors.ngoId`), `401 UNAUTHENTICATED`, `403 FORBIDDEN`

### GET `/api/donations`

- **Auth:** required.
- **Query:** `ngoId?`, `status?: DonationStatus`, `limit?` (1–100, default 50), `offset?` (default 0).
  - Individual accounts get their own donations. `ngoId` optionally narrows to one NGO, and an unknown NGO gives an empty list.
  - NGO accounts must pass the `ngoId` of an NGO they manage. They get the donations that NGO received.
- **200** `{ data: DonationView[], meta: { total: number; limit: number; offset: number } }`, newest first.
- **Errors:** `400 VALIDATION_ERROR` (bad query; or NGO account without `ngoId`), `401 UNAUTHENTICATED`,
  `403 FORBIDDEN` (not a member of that NGO), `404 NOT_FOUND` (unknown NGO, NGO accounts)

### GET `/api/donations/:donationId`

- **Auth:** required. Donor or receiving-NGO member.
- **200** `{ data: DonationDetail }`
- **Errors:** `401 UNAUTHENTICATED`, `404 NOT_FOUND`

### PATCH `/api/donations/:donationId/status`

- **Auth:** required. Only members of the **receiving NGO** may change the status.
- **Body:** `{ status: DonationStatus; note?: string | null }`. The note has at
  most 500 characters and is shown to the donor on the timeline.
- **Rules:** allowed transitions (see `src/features/donations/status.ts`):
  `PENDING → CONFIRMED | REJECTED`, `CONFIRMED → IN_PROGRESS | CANCELLED`,
  `IN_PROGRESS → COMPLETED | CANCELLED`. `COMPLETED`, `REJECTED`, and
  `CANCELLED` are terminal. The status update and its history entry are
  written together.
- **200** `{ data: DonationDetail }`
- **Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`,
  `403 FORBIDDEN` (the donor), `404 NOT_FOUND` (not visible to the caller),
  `409 INVALID_STATUS_TRANSITION`, `409 STATUS_CONFLICT` (the status changed
  concurrently; reload and retry)

### Pages

| Path | Who | Purpose |
|---|---|---|
| `/donations/new?ngo=<id-or-slug>` | individuals | Pledge a donation (linked from "Support this NGO" on NGO profiles) |
| `/donations` | individuals | Donation history, filterable by `?status=` |
| `/donations/:donationId` | donor, NGO members | Progress tracker and timeline; NGO members can update the status |
| `/dashboard/ngos/:ngoId/donations` | NGO members | Donations received, filterable by `?status=` |
