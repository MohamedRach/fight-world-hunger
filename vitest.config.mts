import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // The onboarding wizards take several seconds to drive through their steps;
    // the default 5s made them flaky when the suite ran in parallel.
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      // "server-only" throws outside a React Server environment; tests run in
      // Node/jsdom, so substitute an empty module (used by NGO feature tests).
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
});
