import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@aistudio/db", "better-sqlite3"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
};
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next from bundling native deps like better-sqlite3
  serverExternalPackages: ["@aistudio/db", "better-sqlite3", "bindings"],
};

export default nextConfig;




