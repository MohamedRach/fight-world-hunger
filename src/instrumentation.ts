/**
 * Runs once when the server starts.
 *
 * Loads the fictional demo data from src/mocks so the demo accounts, NGOs,
 * campaigns and donations exist before the first request — otherwise signing
 * in as a seeded demo account would fail until some other page happened to
 * trigger the lazy seed. Seeding is idempotent and only fills an empty store.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureMockDataSeeded } = await import("@/mocks/seed");
  await ensureMockDataSeeded();
}
