// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/countries/[countryId]/ngos/route";
import {
  InMemoryNgoRepository,
  setNgoRepository,
  type NgoRepository,
} from "@/features/discovery/server/ngo-repository";

function call(countryId: string) {
  return GET(new Request(`http://localhost/api/countries/${countryId}/ngos`), {
    params: Promise.resolve({ countryId }),
  });
}

describe("GET /api/countries/:countryId/ngos", () => {
  afterEach(() => {
    setNgoRepository(new InMemoryNgoRepository());
  });

  it("returns the { data, meta } envelope for a valid code", async () => {
    setNgoRepository(
      new InMemoryNgoRepository([
        {
          id: "1",
          name: "Alpha Relief",
          slug: "alpha-relief",
          logoUrl: null,
          shortDescription: "Food distribution.",
          causes: [],
          operatingCountryCodes: ["KEN"],
          websiteUrl: null,
        },
      ]),
    );

    const response = await call("KEN");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("max-age=60");
    await expect(response.json()).resolves.toEqual({
      data: [expect.objectContaining({ id: "1", name: "Alpha Relief" })],
      meta: { countryCode: "KEN", total: 1 },
    });
  });

  it("returns 400 with an error envelope for an invalid code", async () => {
    const response = await call("bad1");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_COUNTRY_CODE");
  });

  it("returns 500 without leaking internals when the repository fails", async () => {
    const failing: NgoRepository = {
      findByOperatingCountry: async () => {
        throw new Error("connection refused to db-host:5432 as user admin");
      },
    };
    setNgoRepository(failing);

    const response = await call("KEN");
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("db-host");
  });
});
