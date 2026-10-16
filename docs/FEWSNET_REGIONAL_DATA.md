# FEWS NET Regional Food-Security Data

**Feature owner:** Developer 2 (Map, discovery, recommendations)  
**Code:** `src/features/fewsnet/`, `src/app/api/countries/[countryId]/regions/route.ts`, `src/components/map/{useRegionalData,IpcLegend,RegionTooltip,RegionalExplorerPanel,globe-polygons}.ts(x)`

This document describes how the 3D hunger globe shows **sub-national acute food insecurity** from the Famine Early Warning Systems Network (FEWS NET) when a user explores a selected country.

---

## 1. What is shown, and what it is not

| | Country view (existing) | Regional view (this feature) |
|---|---|---|
| Indicator | Prevalence of undernourishment (FAO SDG 2.1.1) | FEWS NET IPC-compatible **acute food insecurity phase**, *Current Situation* |
| Unit | % of population, 3-year average | Categorical **IPC phase 1–5** per analysis area |
| Scale | Continuous white → dark red (FAO SOFI classes) | Official IPC categorical palette (Phase 1 `#cdfacd` … Phase 5 `#640000`) |
| Geography | Natural Earth 1:110m countries | FEWS NET analysis units (see §3) |
| Source | FAO via World Bank WDI | FEWS NET Data Warehouse (FDW) |

The two indicators measure different things and are **never mixed**: in regional view, all other countries are drawn in a muted neutral colour (`#2a3650`), the legend switches to the IPC legend, and tooltips/side-panel text name the indicator and its period. Grey analysis areas mean *not classified / no data*, which is explicitly distinguished from Phase 1 in the legend and panel text.

IPC phases are categories. They are not converted to percentages and the undernourishment colour scale is never applied to them.

---

## 2. FEWS NET endpoints and datasets used

Base URL: `https://fdw.fews.net/api` — public data, **no authentication required** (verified: all requests below succeed anonymously and every record has `data_usage_policy: "Public"`). Interactive schema: <https://fdw.fews.net/api/schema/swagger-ui/>.

### 2.1 `ipcphase.json` — locating the latest analysis

Used only to find the most recent published Current Situation analysis for a country. One row per probe:

```
GET /api/ipcphase.json
  ?country_code=KE                       ISO 3166-1 alpha-2
  &scenario=CS                           Current Situation (not ML1/ML2 projections)
  &classification_scale=IPC31            IPC 3.1 (FEWS NET's IPC-compatible scale)
  &classification_scale=AIPC31           IPC 3.1-aligned
  &collection_status=Published
  &start_date=2026-06-01&end_date=2026-06-30   one calendar month
  &fields=simple&page_size=1
```

The loader probes one month at a time, newest first, for up to 14 months (`FEWS_NET_LOOKBACK_MONTHS`). The first month with `count > 0` yields the analysis `reporting_date`, which is then used as `collection_date`.

Why this shape (all verified against the live API, Oct 2026):

- FDW does **not** support `ordering` on this endpoint (requests time out).
- Offsets ≥ 1000 return **HTTP 403**, and `page_size` > 500 returns 403, so "fetch everything and sort" is impossible for countries with >1000 units per analysis (Ethiopia: 1,141).
- Wide date windows are slow server-side (a 14-month window took 15 s and returned an HTML error page); single-month windows take 0.4–3 s.
- Filters that are *not* in the OpenAPI schema (`is_allowing_for_assistance`, `unit_type`) are silently ignored. `geographic_unit_type` and `classification_scale` (by **code**, e.g. `IPC31`, not the label) do work.
- `classification_scale=IPC31` excludes the national-level `IPC_HH` ("IPC Highest Household") rows from the *Food Assistance Outlook Brief*, which are not area classifications.

### 2.2 `ipcphase.geojson` — the analysis itself (data + boundaries)

```
GET /api/ipcphase.geojson
  ?country_code=KE&scenario=CS
  &classification_scale=IPC31&classification_scale=AIPC31
  &collection_status=Published
  &collection_date=2026-06-01
```

- Returns an **unpaginated** FeatureCollection with one feature per analysis unit, including geometry — the only FDW representation that returns all units of a large country in one response.
- Must be requested with `Accept: */*`; an explicit `application/geo+json` Accept header returns **406**.
- Size/latency: Kenya ≈ 11 MB / 640 polygons / 258k vertices, 3–50 s depending on FDW load. Geometry is simplified server-side before anything reaches the browser (§5).

### 2.3 Endpoints investigated but not used

| Endpoint | Finding |
|---|---|
| `geographicunit.json` | Works (tabular units, `unit_type=admin1/admin2/fsc_admin/…`, needs `as_of_date` because units are time-versioned — Kenya still lists its 1982 provinces). Not needed because `ipcphase.geojson` already carries unit metadata. |
| `feature.geojson` / `format=topojson` | Works (`Accept: */*`). Admin1 for Kenya = 55 polygons / 3.5 MB; FSC units = 12 MB (TopoJSON 7 MB). Administrative boundaries **carry no IPC classification**, so drawing them would imply data that does not exist — see §3. |
| `ipcpopulationsize.json` | Works. Population-in-phase estimates (e.g. "1.0–2.5 million in Phase 3+"), mostly national and tied to *Annual Peak Needs* documents. Different indicator; not integrated in this iteration (candidate for the country panel). |
| `ipcclassification.json` | Data-series listing (18k series for Kenya alone). Too heavy for discovery of the latest period. |
| `geographicunitrelationship` | Not needed yet; would allow FSC-unit → admin1/admin2 roll-ups. |

---

## 3. Geographic units and administrative levels

FEWS NET assigns IPC phases to its **food-security analysis units**, not to administrative units:

- `fsc_admin` — an administrative unit used as-is (e.g. Ethiopia: 1,141 units).
- `fsc_admin_lhz` — an administrative unit split by livelihood zone (e.g. Kenya: 640 units, Haiti: 174).
- `idp_camp` — IDP camps, **point** geometry (Kenya has 2). These are listed in the side panel but not drawn.

Each unit's `geographic_unit_full_name` encodes its administrative hierarchy, e.g. `"Southeastern Marginal Mixed Farming Zone, Igembe Central, Meru, Kenya"` (zone, admin 2, admin 1, country). The depth varies by country; the UI shows the full name verbatim rather than parsing it.

**Supported administrative levels:** the application displays exactly the level FEWS NET classifies for each country — no roll-up to admin 1/2 is performed, because aggregating categorical phases (max? population-weighted?) is an analytical choice FEWS NET itself only publishes at national level (`IPC_HH`). Admin 1/2 boundaries are available from FDW but would be drawn **without data**; we deliberately do not do that.

### Identifier matching

| Step | Identifier |
|---|---|
| App country → FEWS NET country | ISO alpha-3 (`ResolvedCountry.code`) → ISO alpha-2 via the committed Natural Earth file (`iso_a2` → `iso_a2_eh` fallback, so France = `FR`, Norway = `NO`, Kosovo = `XK`). Built once per server process in `src/features/geography/server/iso-codes.ts`. Territories with no alpha-2 (Somaliland, Northern Cyprus) → `unsupported`. |
| Region ↔ data | FEWS NET **FNID** (`fnid`, e.g. `KE2016C312030016`), used as the React key, globe polygon key and selection key. Geometry and classification arrive in the same feature, so no join is needed. |

When FDW publishes both assistance variants for the same FNID, one record is kept (`is_allowing_for_assistance === false` preferred, as it is FEWS NET's standard *Food Security Outlook* area series). The variant label is shown verbatim in the panel ("Series: Not allowing for assistance").

---

## 4. Data model

`src/features/fewsnet/types.ts`:

- `RegionClassification` — one unit: `fnid`, `geographicUnitId`, `name`, `fullName`, `unitType`, `phase` (1–5 or `null`), `rawValue`, `description`, `classificationScale`, `scenario`/`scenarioName`, `assistanceVariant`/`isAllowingForAssistance`, `periodStart`/`periodEnd`/`reportingDate`, `sourceOrganization`, `sourceDocument`, `dataUsagePolicy`, `collectionStatus`, `modified`.
- `RegionalDataset` — one analysis for one country: `countryCode` (alpha-3), `fewsNetCountryCode` (alpha-2), `indicator` metadata, `analysisDate`, `periodLabel`, `classificationScales`, `sourceDocuments`, `features` (simplified GeoJSON with `RegionClassification` properties), `pointUnits`, `summary` (`byPhase`, `classified`, `notClassified`), `bbox`, `providerLastModified`, `retrievedAt`, `attribution` (incl. deep link to the exact FDW extract).
- `RegionalAvailability` — `available | unavailable (no-published-analysis | no-polygon-geometry) | unsupported (no-iso2 | invalid-country-code)`.

A provider `value` outside 1–5 (FDW uses codes such as "Not Analyzed") keeps `rawValue`/`description` and sets `phase: null` → drawn grey, labelled "not classified". **No value is ever fabricated.**

---

## 5. Request, caching and error handling

```
browser ──GET /api/countries/KEN/regions──▶ route handler
                                             └─ loadRegionalData(iso3)
                                                 ├─ lookupCountryIdentity        (fs, once per process)
                                                 ├─ loadLatestAnalysisDate(iso2) "use cache", cacheLife('hours')
                                                 │    └─ ≤15 single-row FDW probes (one per month)
                                                 └─ loadAnalysisDataset(iso3, iso2, name, date)
                                                      "use cache", cacheLife('days')
                                                      └─ 1 FDW GeoJSON request → Zod validate → simplify → normalise
```

- **Server-side only.** The browser never calls fews.net; it calls the app's route, which returns the `{ data, meta }` envelope used elsewhere.
- **Validation:** every FDW response is parsed with Zod (`src/features/fewsnet/schema.ts`). Unexpected shapes become `UPSTREAM_INVALID_RESPONSE` (HTTP 502).
- **Timeouts:** 45 s per probe, 120 s for the GeoJSON extract (`AbortSignal.timeout`).
- **Transient upstream failures are retried once** (after 2.5 s) — FDW answers bursts with 403, occasionally serves an HTML error page, or times out when busy.
- **Failures are returned as values from the cached functions**, not thrown: errors thrown inside `"use cache"` surface to callers as an opaque Server Components error in production. Failures are cached for ~20 s (`{ stale: 20, revalidate: 20, expire: 60 }`), which absorbs retry bursts without making a user's own *Try again* pointless. The route maps them to **503** (`UPSTREAM_UNAVAILABLE`, with `Retry-After`), **502** or **500** with user-safe messages; details go to the server log only.
- **Browser-side failures** (connection dropped before the response arrived — typically a dev-server restart or a proxy cutting a long request) are reported separately in the UI with a retry; they are not FEWS NET outages.
- **Simplification:** Douglas–Peucker at 0.01° (~1 km), coordinates rounded to 4 dp, rings that collapse are dropped (`simplify.ts`, no dependencies). Kenya: 11 MB → ~675 KB over the wire. Rings are simplified independently, so adjacent borders may diverge by ≤ 1 km — invisible at globe scale.
- **Client cache:** `useRegionalData` keeps results per country for the page session, so toggling between countries does not refetch.
- **Edge cache:** `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- **Freshness is stated, not implied:** the panel shows the analysis date, validity period, retrieval date and the provider's record-modification date. Nothing is described as live.

### Cold-start latency and warm-up

The first request for a country is slow (observed: Kenya 12 s, Haiti 5.6 s, France "unavailable" after 14 probes 10 s; FDW occasionally takes 50 s+ for the GeoJSON). Subsequent requests are served from the Next.js cache in < 1 s. The UI says so while loading. After a deploy, warm the cache for priority countries:

```bash
for c in KEN ETH SOM SSD SDN NGA HTI AFG YEM; do curl -s -o /dev/null -w "$c %{http_code} %{time_total}s\n" "$BASE_URL/api/countries/$c/regions"; done
```

Hosting note: the route can run for over a minute on a cold cache; make sure the platform's function timeout allows it, or run the warm-up right after deploy.

---

## 6. How the feature works in the UI

1. User selects a country (click, or the keyboard-accessible country picker). The existing country panel appears, now with a **"Regional food security (FEWS NET)"** section containing *Explore regions in {country}*. Territories without an ISO alpha-2 code do not get the section.
2. Clicking it enters **region mode** for that country: `GET /api/countries/{code}/regions` is called, a loading state is shown on both the globe and the panel (with the cold-start warning).
3. **Available:** the country's own polygon is replaced on the globe by its FEWS NET analysis units coloured by IPC phase; all other countries turn muted; the camera frames the dataset's bounding box; the legend switches to the IPC legend (with per-phase counts, the not-classified swatch, the muted-country swatch and the FEWS NET credit line). Hovering a unit shows name, full hierarchy, phase and period; clicking selects it and the panel shows phase definition, unit type, FNID, scale, series variant, source document and usage policy.
4. **Unavailable / unsupported:** the panel explains why (no published analysis in 14 months, no drawable geometry, or no alpha-2 code); the country view, legend and NGO list remain unchanged.
5. **Error:** a 5xx from the route shows an alert with *Try again*; the country view stays usable.
6. *Back to country view* (or selecting another country, or closing the panel) exits region mode and re-centres on the country. Region mode and region selection are keyed by country, so they reset automatically when the selection changes.

### Regional NGO discovery

NGO operating coverage is recorded at **country level only** (`NgoSummary.operatingCountryCodes`), so in region mode the sidebar keeps the country-level NGO list and shows the note *"NGO coverage is recorded at country level only, so this list shows organisations operating anywhere in {country}; none are specifically linked to {region}"*. No NGO records or regional affiliations are invented, no schema is changed, and the NGO list keeps working when FEWS NET data is unavailable. If the NGO schema later gains sub-national coverage (e.g. a list of FNIDs or admin codes per NGO), the natural extension is `GET /api/countries/:code/ngos?region=<fnid>` reusing `NgoRepository`.

---

## 7. Attribution and data usage

Per the [FEWS NET Data and Information Use and Attribution Policy](https://help.fews.net/fdp/data-and-information-use-and-attribution-policy):

- Attribution appears **on the visual** (IPC legend credit line "Source: FEWS NET acute food insecurity classification — fews.net"), in every region tooltip ("· FEWS NET"), and in the side panel with links to the FEWS NET website, the exact dataset extract URL and the policy page.
- The panel states that FEWS NET does not endorse this platform; no FEWS NET logo or trademark is used.
- Only records with `data_usage_policy: "Public"` are returned anonymously by FDW; the value is shown per unit. If FEWS NET ever adds a non-public policy to a public extract, it will be displayed rather than hidden.
- The underlying classifications are FEWS NET's own (source organisation "FEWS NET", document "Food Security Outlook, {country}"); no third-party datasets with separate licences are redistributed.
- Availability and reporting periods differ by country and are shown explicitly.

---

## 8. Configuration

None. No environment variables, credentials or new runtime dependencies. Everything uses the existing `fetch`, Zod, Next.js `"use cache"`/`cacheLife` and the `react-globe.gl` polygon layer.

---

## 9. Verified coverage (October 2026)

| Country | Latest CS analysis | Units | Notes |
|---|---|---|---|
| Kenya (KE) | 2026-06-01 (Jun 2026) | 640 `fsc_admin_lhz` + 2 `idp_camp` points | Phases 1–3 present |
| Ethiopia (ET) | 2026-06-01 | 1,141 `fsc_admin` + 20 `idp_camp` | >1000 rows — only the GeoJSON path works |
| Haiti (HT) | 2026-06-01 | 174 `fsc_admin_lhz` | Phases 2–4 present |
| France (FR) | none | — | Correctly reported as unavailable |

Other FEWS NET-monitored countries are expected to work through the same code path but have **not been individually verified**. FEWS NET monitors roughly 30–40 countries in Africa, Central Asia, Central America and the Caribbean; most countries on the globe will show the "no published analysis" state.

---

## 10. Known limitations and remaining work

- **Cold-start latency** of 5–60 s per country until cached (see §5). A build-time or scheduled warm-up is recommended for production.
- **Assistance variant semantics.** FDW labels series "Allowing" / "Not allowing for assistance" without a public definition in the API metadata. The label is shown verbatim and documented here; it is not interpreted for users.
- **One analysis per country.** Only the latest *Current Situation* is shown; near- and medium-term projections (`ML1`, `ML2`) are available from the same endpoints and would be a natural toggle.
- **No admin-level roll-ups.** Phases are shown for FEWS NET's analysis units only (§3).
- **Point units** (IDP camps) are counted and listed but not drawn; a globe points layer could show them.
- **Population estimates** (`ipcpopulationsize`) are not integrated.
- **Analysis-date discovery** takes the `reporting_date` of the first row in the newest month with data; if FEWS NET published two Current Situation analyses in the same month, one could be missed.
- **Independent ring simplification** can open ≤ 1 km slivers between neighbouring units; acceptable at globe scale, not for cartographic export.
- **Desktop side-panel layout** (≥ 1024 px) has only been checked at 800 px viewport width in this and the previous feature.
- Not covered by automated tests in this change (tests were explicitly out of scope for this task).
