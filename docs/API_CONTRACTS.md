# API Contracts

Conventions (all endpoints):

- Success: `{ "data": …, "meta": { … } }`
- Error: `{ "error": { "code": "UPPER_SNAKE_CASE", "message": "user-safe text" } }`
- Country identifiers in paths are ISO 3166-1 alpha-3 (3 letters, case-insensitive, normalised to upper case). Malformed codes → `400 INVALID_COUNTRY_CODE`.
- All validation and authorisation happen on the server. Internal error details are logged, never returned.

Endpoints owned by other developers (NGO profiles, donations, auth) are not yet implemented and should be added here by their owners before integration.

---

## GET `/api/countries/:countryId/ngos`

**Owner:** Developer 2 · **Auth:** none (public NGO summaries only) · **Since:** `feature/interactive-3d-hunger-globe`

NGOs recorded as operating in the country.

Response `200`:

```json
{
  "data": [
    {
      "id": "string",
      "name": "string",
      "slug": "string",
      "logoUrl": "string | null",
      "shortDescription": "string",
      "causes": ["string"],
      "operatingCountryCodes": ["KEN", "SOM"],
      "websiteUrl": "string | null"
    }
  ],
  "meta": { "countryCode": "KEN", "total": 1 }
}
```

Errors: `400 INVALID_COUNTRY_CODE`, `500 INTERNAL_ERROR`.  
Cache: `public, max-age=60, stale-while-revalidate=300`.  
Data source: `NgoRepository` (`src/features/discovery/server/ngo-repository.ts`). Until the NGO entity exists the repository is empty, so `data` is `[]`.

---

## GET `/api/countries/:countryId/regions`

**Owner:** Developer 2 · **Auth:** none (FEWS NET public data) · **Since:** `feature/fewsnet-regional-hunger-data`

Latest published FEWS NET *Current Situation* IPC-compatible acute food insecurity classification for the country's analysis areas, with simplified boundaries. See `docs/FEWSNET_REGIONAL_DATA.md`.

Response `200` — `data` is a discriminated union on `status`:

```json
{
  "data": {
    "status": "available",
    "dataset": {
      "countryCode": "KEN",
      "fewsNetCountryCode": "KE",
      "countryName": "Kenya",
      "indicator": { "id": "fewsnet-ipc-cs", "name": "…", "shortName": "IPC phase", "description": "…", "unit": "ipc-phase" },
      "analysisDate": "2026-06-01",
      "periodLabel": "Jun 2026",
      "classificationScales": ["IPC 3.1"],
      "sourceDocuments": ["Food Security Outlook, Kenya"],
      "features": [
        {
          "type": "Feature",
          "geometry": { "type": "Polygon", "coordinates": [[[lng, lat], …]] },
          "properties": {
            "kind": "region",
            "fnid": "KE2016C312030016",
            "geographicUnitId": 12345,
            "name": "Southeastern Marginal Mixed Farming Zone",
            "fullName": "Southeastern Marginal Mixed Farming Zone, Igembe Central, Meru, Kenya",
            "unitType": "fsc_admin_lhz",
            "phase": 2,
            "rawValue": 2,
            "description": "Stressed",
            "classificationScale": "IPC 3.1",
            "scenario": "CS",
            "scenarioName": "Current Situation",
            "assistanceVariant": "Not allowing for assistance",
            "isAllowingForAssistance": false,
            "periodStart": "2026-06-01",
            "periodEnd": "2026-06-30",
            "reportingDate": "2026-06-01",
            "sourceOrganization": "FEWS NET",
            "sourceDocument": "Food Security Outlook, Kenya",
            "dataUsagePolicy": "Public",
            "collectionStatus": "Published",
            "modified": "2026-06-30T12:00:00"
          }
        }
      ],
      "pointUnits": [ /* RegionClassification without geometry, e.g. IDP camps */ ],
      "summary": { "classified": 640, "notClassified": 0, "byPhase": { "1": 245, "2": 123, "3": 272, "4": 0, "5": 0 } },
      "bbox": [33.9434, -4.6774, 41.8938, 5.4671],
      "providerLastModified": "2026-06-30T12:00:00",
      "retrievedAt": "2026-10-16T18:40:00.000Z",
      "attribution": {
        "name": "FEWS NET",
        "fullName": "Famine Early Warning Systems Network (FEWS NET)",
        "websiteUrl": "https://fews.net/",
        "policyUrl": "https://help.fews.net/fdp/data-and-information-use-and-attribution-policy",
        "datasetUrl": "https://fdw.fews.net/api/ipcphase.geojson?…",
        "creditLine": "Source: FEWS NET acute food insecurity classification"
      }
    }
  },
  "meta": { "countryCode": "KEN", "retrievedAt": "2026-10-16T18:40:00.000Z", "cached": null }
}
```

Other `data.status` values (still HTTP `200`, since the request itself succeeded):

```json
{ "status": "unavailable", "countryCode": "FRA", "fewsNetCountryCode": "FR",
  "reason": "no-published-analysis" | "no-polygon-geometry", "message": "…" }

{ "status": "unsupported", "countryCode": "SOL",
  "reason": "no-iso2" | "invalid-country-code", "message": "…" }
```

`phase` is `1–5` or `null` (not classified). Phases are categorical and must be rendered with the IPC palette (`src/features/fewsnet/source.ts`), never with the undernourishment scale.

Errors: `400 INVALID_COUNTRY_CODE`, `503 UPSTREAM_UNAVAILABLE` (with `Retry-After: 120`), `502 UPSTREAM_INVALID_RESPONSE`, `500 INTERNAL_ERROR`.  
Cache: `public, max-age=300, stale-while-revalidate=3600`; server-side `"use cache"` (hours for the analysis date, days for the dataset, minutes for failures).  
Payload size: ~200–700 KB for large countries after simplification. Cold requests may take up to a minute (see the FEWS NET doc).
