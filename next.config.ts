import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/**": ["./lib/contract-generator/templates/**"],
  },
};

export default nextConfig;
