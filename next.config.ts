import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // playwright is a native/heavy package used server-side to render contract PDFs;
  // keep it external so the standalone build copies the real package into
  // node_modules instead of trying to bundle it (which drops its runtime files).
  serverExternalPackages: ["playwright", "playwright-core"],
  outputFileTracingIncludes: {
    "/**": ["./lib/contract-generator/templates/**"],
  },
};

export default nextConfig;
