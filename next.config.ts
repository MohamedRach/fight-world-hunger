import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Emits .next/standalone with only the files the server needs, so the
  // Docker image does not ship the whole node_modules tree. Harmless for
  // `next dev` and `next start`.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
