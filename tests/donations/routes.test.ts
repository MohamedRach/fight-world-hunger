// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionAccount } from "@/features/accounts/types";

let currentUser: SessionAccount | null = null;
vi.mock("@/features/ngos/session", () => ({
  getSessionUser: async () => currentUser,
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));

import { GET as listRoute, POST as createRoute } from "@/app/api/donations/route";
import { GET as detailRoute } from "@/app/api/donations/[donationId]/route";
import { PATCH as statusRoute } from "@/app/api/donations/[donationId]/status/route";
import { setDonationRepositoryForTesting } from "@/features/donations/repository";
import { setNgoRepositoryForTesting } from "@/features/ngos/repository";
import { setIndividualRepositoryForTesting } from "@/features/individuals/repository";
import { createNgo } from "@/features/ngos/service";

const DONOR: SessionAccount = {
  id: "donor",
  email: "donor@example.org",
  type: "INDIVIDUAL",
  displayName: "Dana Donor",
};
const REP: SessionAccount = {
  id: "rep",
  email: "rep@ngo.org",
  type: "NGO",
  displayName: "Rita Rep",
};

let ngoId: string;

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = (donationId: string) => ({ params: Promise.resolve({ donationId }) });

beforeEach(async () => {
  setDonationRepositoryForTesting(undefined);
  setNgoRepositoryForTesting(undefined);
  setIndividualRepositoryForTesting(undefined);
  currentUser = null;
  const ngo = await createNgo(REP.id, {
    name: "Food For All",
    shortDescription: "Fighting hunger with local food banks.",
    mission: "We distribute surplus food to families facing food insecurity.",
    primaryCause: "HUNGER_RELIEF",
    hqCountryCode: "FRA",
    operatingCountryCodes: ["FRA"],
  });
  ngoId = ngo.id;
});

async function createAsDonor() {
  currentUser = DONOR;
  const response = await createRoute(
    jsonRequest("/api/donations", "POST", { ngoId, amount: 30, currency: "USD" }),
  );
  return (await response.json()) as { data: { id: string } };
}

describe("donations API", () => {
  it("POST requires authentication and valid JSON", async () => {
    const anonymous = await createRoute(
      jsonRequest("/api/donations", "POST", { ngoId, amount: 30, currency: "USD" }),
    );
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toMatchObject({ error: { code: "UNAUTHENTICATED" } });

    currentUser = DONOR;
    const malformed = await createRoute(jsonRequest("/api/donations", "POST", "{nope"));
    expect(malformed.status).toBe(400);
  });

  it("POST creates a donation (201) and returns field errors (400)", async () => {
    const { data } = await createAsDonor();
    expect(data.id).toBeTruthy();

    const invalid = await createRoute(
      jsonRequest("/api/donations", "POST", { ngoId, amount: -1, currency: "USD" }),
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", fieldErrors: { amount: expect.any(Array) } },
    });
  });

  it("GET lists with a { data, meta } envelope", async () => {
    await createAsDonor();
    const response = await listRoute(new Request("http://localhost/api/donations?limit=10"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [{ amount: 30, currency: "USD", status: "PENDING" }],
      meta: { total: 1, limit: 10, offset: 0 },
    });
  });

  it("PATCH status enforces authorization and transitions", async () => {
    const { data } = await createAsDonor();

    const byDonor = await statusRoute(
      jsonRequest(`/api/donations/${data.id}/status`, "PATCH", { status: "CONFIRMED" }),
      params(data.id),
    );
    expect(byDonor.status).toBe(403);

    currentUser = REP;
    const invalid = await statusRoute(
      jsonRequest(`/api/donations/${data.id}/status`, "PATCH", { status: "COMPLETED" }),
      params(data.id),
    );
    expect(invalid.status).toBe(409);
    expect(await invalid.json()).toMatchObject({ error: { code: "INVALID_STATUS_TRANSITION" } });

    const ok = await statusRoute(
      jsonRequest(`/api/donations/${data.id}/status`, "PATCH", {
        status: "CONFIRMED",
        note: "Welcome!",
      }),
      params(data.id),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ data: { status: "CONFIRMED" } });

    currentUser = DONOR;
    const detail = await detailRoute(
      new Request(`http://localhost/api/donations/${data.id}`),
      params(data.id),
    );
    const body = (await detail.json()) as { data: { history: Array<{ note: string | null }> } };
    expect(body.data.history.map((entry) => entry.note)).toEqual([null, "Welcome!"]);
  });

  it("GET detail returns 404 for donations the user can't see", async () => {
    const { data } = await createAsDonor();
    currentUser = { ...DONOR, id: "someone-else" };
    const response = await detailRoute(
      new Request(`http://localhost/api/donations/${data.id}`),
      params(data.id),
    );
    expect(response.status).toBe(404);
  });
});
