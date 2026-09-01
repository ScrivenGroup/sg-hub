import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/p/funds-forecaster/development/reference": [
      "./src/modules/funds-forecaster/reference/index.html",
    ],
  },
};

export default nextConfig;
