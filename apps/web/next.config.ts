import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@aistudio/db", "better-sqlite3", "bindings"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
