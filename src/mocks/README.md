# Mock data

JSON seed data for the **simulated** donation workflows (campaigns, mock cards,
donations). Everything here is fictional and is labelled "Demo data" in the UI.

## How it is used

`src/mocks/seed.ts` loads these files once per server process and creates the
records through the normal repositories and services, exactly as a user would.
Entities reference each other through the stable **keys** in these files
(`ngoKey`, `individualKey`, `campaignKey`, …); real ids are generated at
runtime, so no fake UUIDs are invented.

Seeding only runs when the store is empty, so it never overwrites data you
create by hand.

## Persistence model

Mutations are written to the in-memory repositories under `globalThis`, the
same mechanism the existing NGO, individual and account features use. That
means:

- Changes **persist across page navigation and browser refreshes**.
- Changes are **lost when the dev server restarts**, and these JSON seeds are
  re-applied.

The browser never writes application data: no `localStorage`, no writes to the
files below. When the team's ORM lands, each repository can be reimplemented
against PostgreSQL without changing any caller.

## Files

| File | Contents |
|---|---|
| `individuals.json` | Demo donor accounts and their profiles |
| `ngos.json` | Demo NGO accounts and their organization profiles |
| `payment-methods.json` | Demo **mock** cards (brand, last 4, expiry, label only) |
| `campaigns.json` | Demo fundraising campaigns, with the countries they serve |
| `donations.json` | Demo donations, including their status history |

## Safety

`payment-methods.json` contains no real payment data: only a brand, the last
four digits of a well-known **test** card, a holder name, an expiry and a
label. Never add real card numbers or CVV codes to these files.
