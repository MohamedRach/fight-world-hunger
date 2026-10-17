#!/usr/bin/env node
/**
 * Seeds demo accounts, NGOs and donations through the real API, so the app can
 * be presented without clicking through every form.
 *
 *   node scripts/seed-demo.mjs [base-url]     (default http://localhost:3000)
 *
 * Re-running is safe: existing accounts are reused and new donations are added.
 * Data lives in memory, so this must run again after a server restart.
 */

const BASE_URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

async function call(method, path, body, session) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: session } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed: ${response.status} ${text}`);
  }
  return response.json();
}

/** Signs in and returns the session cookie, or null when the account is missing. */
async function signIn(email, accountType) {
  const response = await fetch(`${BASE_URL}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, accountType }),
  });
  if (!response.ok) return null;
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

async function ensureAccount(email, accountType, create) {
  const cookie = await signIn(email, accountType);
  if (cookie) return cookie;
  const { data } = await call("POST", `/api/accounts/${accountType.toLowerCase()}`, create);
  return signIn(email, accountType);
}

async function ensureNgo(email, representativeName, ngo) {
  const cookie = await signIn(email, "NGO");
  if (cookie) return cookie;
  await call("POST", "/api/accounts/ngo", {
    account: { representativeName, email },
    ngo,
  });
  return signIn(email, "NGO");
}

async function main() {
  const foodForAll = await ensureNgo("nadia@foodforall.org", "Nadia Okafor", {
    name: "Food For All",
    shortDescription: "Community food banks and school meals across the Sahel.",
    mission:
      "We make sure no child in our communities goes to school hungry, by running food banks and school meal programs.",
    primaryCause: "HUNGER_RELIEF",
    otherCauses: ["EDUCATION"],
    hqCountryCode: "NGA",
    hqCity: "Kano",
    operatingCountryCodes: ["NGA", "NER", "TCD"],
  });

  const cleanWater = await ensureNgo("omar@cleanwater.org", "Omar Haddad", {
    name: "Clean Water Now",
    shortDescription: "Wells and water purification for rural villages.",
    mission: "We bring safe drinking water to rural communities through wells and filters.",
    primaryCause: "CLEAN_WATER",
    hqCountryCode: "KEN",
    operatingCountryCodes: ["KEN", "ETH"],
  });

  const alice = await ensureAccount("alice@example.org", "INDIVIDUAL", {
    fullName: "Alice Martin",
    email: "alice@example.org",
    acceptPrivacyPolicy: true,
  });

  const bob = await ensureAccount("bob@example.org", "INDIVIDUAL", {
    fullName: "Bob Diallo",
    email: "bob@example.org",
    donateAnonymously: true,
    acceptPrivacyPolicy: true,
  });

  const donate = (cookie, body) => call("POST", "/api/donations", body, cookie);
  const setStatus = (cookie, id, body) =>
    call("PATCH", `/api/donations/${id}/status`, body, cookie);

  const inProgress = await donate(alice, {
    ngoId: "food-for-all",
    amount: 42.5,
    currency: "EUR",
    message: "For school meals in Kano.",
  });
  await setStatus(foodForAll, inProgress.data.id, {
    status: "CONFIRMED",
    note: "Thank you, Alice! Your pledge is confirmed.",
  });
  await setStatus(foodForAll, inProgress.data.id, {
    status: "IN_PROGRESS",
    note: "We are buying rice and beans for 120 school meals.",
  });

  const completed = await donate(alice, { ngoId: "clean-water-now", amount: 120, currency: "USD" });
  await setStatus(cleanWater, completed.data.id, { status: "CONFIRMED" });
  await setStatus(cleanWater, completed.data.id, { status: "IN_PROGRESS" });
  await setStatus(cleanWater, completed.data.id, {
    status: "COMPLETED",
    note: "A new well is running in Kitui. Thank you!",
  });

  const anonymous = await donate(bob, { ngoId: "food-for-all", amount: 15, currency: "GBP" });
  await setStatus(foodForAll, anonymous.data.id, { status: "CONFIRMED" });

  await donate(alice, {
    ngoId: "food-for-all",
    amount: 250,
    currency: "USD",
    message: "Happy to help the food bank.",
  });

  console.log("Seeded demo data at", BASE_URL);
  console.log("  alice@example.org   (individual, 3 donations)");
  console.log("  bob@example.org     (individual, anonymous)");
  console.log("  nadia@foodforall.org (NGO)");
  console.log("  omar@cleanwater.org  (NGO)");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
