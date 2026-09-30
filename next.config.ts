import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must not be bundled by Turbopack/webpack.
  // Next.js leaves it as a plain Node require instead.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
