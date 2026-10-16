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

## Sign-in (temporary)

`/sign-in?as=individual|ngo[&next=/path]` is a development-only sign-in
(email, no password) that sets the session stub's cookie. One account can
hold an individual profile **and** NGO memberships. `next` accepts same-site
paths only. To be replaced by Developer 1's authentication.
