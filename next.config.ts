import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  distDir: process.env.NODE_ENV === "production" ? "prod" : (process.env.NODE_ENV === "test" ? "stage" : "out"),
  trailingSlash: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true
  },
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"]
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "development" ? false : { exclude: ["error"] }
  }
};

export default nextConfig;
