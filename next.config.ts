import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "*": [
      "./data/**",
      "./data/**/*",
      "data/**",
      "data/**/*",
      "**/data/**",
    ],
  },
  serverExternalPackages: ["postgres", "drizzle-orm"],
  outputFileTracingIncludes: {
    "/p/funds-forecaster/development/reference": [
      "./src/modules/funds-forecaster/reference/index.html",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
    /** Default 10mb; Mate harvest JSON is ~18mb. */
    middlewareClientMaxBodySize: "32mb",
  },
};

export default nextConfig;
