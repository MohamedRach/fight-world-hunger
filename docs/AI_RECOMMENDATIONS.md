# World hunger interests & AI campaign recommendations

**Branch:** `feature/ai-world-hunger-recommendations` (from `be74d69`)
**Code:** `src/features/hunger-issues/`, `src/features/recommendations/`,
`src/components/hunger-issues/`, `src/app/api/countries/[countryId]/recommendations/`

Individuals say which world hunger issues they care about, NGOs say which they
work on, campaigns tag the issues they actually address — and the three are
matched to recommend campaigns in the country a visitor selects.

---

## 1. The shared taxonomy

`src/features/hunger-issues/catalog.ts` is the single source of truth: 12
issues, each with a stable id, label, short label and description.

| Entity | Field | Meaning |
|---|---|---|
| Individual | `hungerInterests` | Issues the donor cares about |
| NGO | `hungerFocusAreas` + `hungerMission` | Issues the organization works on, and how |
| Campaign | `issueTags` | Issues this specific campaign addresses |

Ids (`school_meals`, `child_malnutrition`, `food_waste_reduction`, …) are
permanent; renaming one would orphan stored profiles and campaigns.

It is TypeScript rather than JSON because Zod enums and the type system need
the ids at compile time; a parallel `world-hunger-issues.json` would be a
second source of truth that could drift. `HungerIssuePicker` renders it for
all three forms, so they always offer the same options.

**An NGO's focus areas do not define its campaigns.** Campaign tags are
entered per campaign and are never copied from the organization — an NGO
working on five issues can run a campaign about one.

---

## 2. Onboarding changes

- **Individual** (`IndividualProfileFields`, interests step): the generic
  cause checkboxes are replaced by the hunger issue chips. The stored schema
  tolerates an empty list (so older profiles and programmatic callers stay
  valid), but the onboarding and edit forms require at least one — see
  `requireHungerInterests` in `src/features/individuals/onboarding.ts`.
  Donors change their interests any time at `/me/edit`.
- **NGO** (`NgoOnboardingWizard`, "causes" step): adds the focus-area picker
  and a "How you tackle hunger" mission field, both editable later from the
  NGO profile form. The pre-existing `primaryCause`/`otherCauses` fields are
  left in place so NGO cards and map discovery keep working.
- **Campaign** (`CampaignCreateForm`): adds the issue-tag picker, capped at 5
  so a campaign stays focused. Tags are shown on campaign cards, with matched
  ones highlighted.

---

## 3. How a recommendation is produced

`GET /api/countries/:countryId/recommendations` returns the country's
campaigns *and* the ranking in one response, so the list and the
recommendations can never disagree and no campaign is rendered twice.

```
country selected
   └─ load campaigns serving that country   (public only: drafts excluded)
      ├─ eligible   = ACTIVE          → candidates + "more campaigns"
      └─ closed     = PAUSED/…        → listed separately, never recommended
   └─ viewer?
      ├─ anonymous / NGO account      → source "generic", no personalised badge
      ├─ donor without interests      → source "generic" + prompt to pick issues
      └─ donor with interests
         ├─ cache hit (5 min)         → cached result
         ├─ LLM configured            → rank, then VALIDATE → source "llm"
         └─ otherwise / on any failure→ deterministic ranking → source "fallback"
```

`source` is always reported, and the UI only says "Recommended for you" for
personalised results. Fallback output is never presented as model-generated.

### Validation of model output

Two layers, in `schema.ts` then `server/service.ts`:

1. The response must match the Zod schema (ids, explanation ≤ 300 chars, tag
   arrays). Anything else → fallback.
2. Every returned `campaignId` must be in the candidate set that was sent;
   duplicates are dropped; `matchedInterests` is intersected with the donor's
   own interests and `matchedIssueTags` with that campaign's own tags.

So the model cannot invent a campaign, surface one from another country,
recommend a closed campaign, or claim an interest the donor never chose. It
only ever ranks and explains — it never writes application data.

### Deterministic fallback

`fallback.ts` scores each candidate: **3 points** per donor interest matching a
campaign issue tag, **1 point** per interest matching only the owning NGO's
focus areas (weaker evidence). Ties break on matched-tag count, then title, so
the order is stable. When nothing overlaps, the explanation says exactly that
rather than inventing a connection.

### Caching

Results are cached per `(viewer, country, interests, candidate campaigns + their
tags)` for 5 minutes. Changing interests, a campaign tag, or the country
produces a different key, so recommendations refresh instead of going stale.
Failures are not cached, and the client fetches once per country selection.

### Loading experience

While the request is pending, the country sidebar shows an animated
recommendation-assistant panel: country campaigns, hunger interests, and
relevant matches. The highlighted icon cycles every 1.6 seconds and resets
when the country or retry attempt changes. Animation respects reduced-motion
preferences.

This is explicitly labelled an **illustrative workflow**, not live server
progress or the model's private reasoning. The API returns a single response;
the animation does not claim steps have completed and never delays results
for presentation. The same loader covers cached, generic, fallback and LLM
responses because their source is only known after the response arrives.
Successful recommendations show their actual source: "AI-assisted matches",
"Interest-based matches · no AI model used", or "General suggestions · not
personalised". Errors replace the panel with the existing retry control.

Regression coverage:
`tests/components/CountryCampaignList.test.tsx` checks pending, success,
error/retry, country changes, source labels and timer/request cleanup.

### Prompt safety

Campaign titles, summaries and NGO missions are untrusted input. They are sent
as a JSON **data** block, never concatenated into the instructions; control
characters are stripped and text is truncated; and the system prompt states
that input text is data and must not change the rules. Only interests, country
and campaign/NGO text are sent — never names, emails, donations or payment data.

---

## 4. Configuring the provider

Server-side only. Copy `.env.example` to `.env.local` (git-ignored) and set:

```dotenv
LLM_API_KEY=sk-…            # required to enable the LLM; empty = fallback mode
LLM_PROVIDER=openai         # or "anthropic"
LLM_MODEL=                  # default gpt-4o-mini / claude-3-5-haiku-latest
LLM_BASE_URL=               # optional gateway/proxy override
LLM_TIMEOUT_MS=             # optional, default 12000
```

No `NEXT_PUBLIC_*` variable is used, so the key cannot reach the browser; it is
read only inside `src/features/recommendations/server/llm-client.ts`. Provider
errors are logged server-side with a reason code only — the HTTP response never
contains the key, the URL or a stack trace.

**Without a key the app works normally** and every result is labelled
`fallback`.

---

## 5. Mock dataset

Seed JSON lives in `src/mocks/` (see `src/mocks/README.md` for the persistence
model — JSON seeds → in-memory repositories under `globalThis`, which survive
navigation and refresh and reset on server restart; the browser never writes
application data and the JSON files are never modified at runtime).

| File | Contents |
|---|---|
| `individuals.json` | 3 donors with **different** interest sets |
| `ngos.json` | 4 NGOs with distinct focus areas, missions and countries |
| `campaigns.json` | 11 campaigns incl. one PAUSED and one COMPLETED |
| `donations.json` | 10 donations across statuses |
| `payment-methods.json` | 4 mock cards (brand, last 4, expiry only) |

Referential integrity is held by the `key` fields: campaigns reference an
`ngoKey`, donations an `individualKey` + `campaignKey` + `paymentMethodKey`,
and the seeder resolves them to runtime ids, so no dangling id can exist. Every
interest and tag is a catalog id; every campaign serves countries its NGO
operates in; donation NGO always matches the campaign's NGO.

**Reset the mock state** by restarting the dev server — the seeds re-apply.

Coverage for comparing recommendations: Kenya 4 eligible, Somalia 2 (+1
paused), Haiti 1 (+1 completed), Ethiopia 2, India/Bangladesh, South Sudan.

---

## 6. In the country sidebar

Selecting a country shows, in order: **Recommended for you** (up to 3, with a
badge, a tinted card, the one-line explanation and matched tags highlighted),
then **More campaigns**, then **Closed to donations**. Donate buttons behave
as before. Anonymous visitors see the plain list plus an invitation to sign in;
donors with no interests get a link to set them.

---

### Provider quirks found in testing

- Newer Anthropic models **reject `temperature`** (`400 invalid_request_error:
  "temperature is deprecated for this model"`). The client therefore sends no
  temperature; the JSON schema constrains the output instead.
- Model ids differ per key. List what a key can use with:
  `GET https://api.anthropic.com/v1/models` (header `x-api-key`). A wrong id
  returns `404 not_found_error`, which the app treats as an outage and falls
  back.
- Provider rejections are now logged server-side with status and a truncated
  body, so a misconfiguration is diagnosable without exposing anything to the
  browser.

## 7. Verified manually (October 2026)

- Anonymous → `generic`, no personalised badge, sign-in prompt.
- Three donors with different interests → different rankings in the same
  country (school meals first for one, food-waste first for another).
- Somalia: PAUSED campaign excluded from candidates, listed as closed.
  Haiti: COMPLETED campaign likewise.
- Kenya: 4 eligible → 3 recommended + 1 under "More campaigns", no duplicates.
- Changing country changes both lists.
- **Simulated provider outage** (key set, `LLM_BASE_URL` unreachable): fell
  back in ~870 ms, `source: "fallback"`, no key/URL/stack in the response, one
  server-side warning logged.
- **Real provider (Anthropic `claude-haiku-5-5`)**: `source: "llm"` in 3–5 s
  cold, served from cache afterwards. Examples produced:
  - food-waste donor in Kenya → surplus-produce kitchens first, drought seed
    second (2 results: the model declined to pad to 3, as instructed).
  - displacement-focused donor in Somalia → emergency rations first.
  - school-meals donor in Ethiopia → school meals, then school gardens.
  Every returned id was inside the candidate set and every matched tag was a
  genuine subset of that campaign's tags.
- `tsc --noEmit` clean.

## 8. Limitations

- Ranking quality has been sampled, not systematically evaluated; token cost
  and rate-limit behaviour under load are untested.
- OpenAI is implemented to the same contract but was **not** exercised against
  a live OpenAI key (testing used Anthropic).
- Recommendations are computed per country selection; there is no background
  refresh if an NGO edits tags while the sidebar is open (the 5-minute cache
  key changes, so the next selection picks it up).
- The fallback's weights (3 / 1) are a deliberate heuristic, not a tuned model.
- No separate "why these?" detail view; the explanation is one sentence.
- NGO `primaryCause`/`otherCauses` still exist alongside focus areas; merging
  them is a follow-up once other features stop reading them.
