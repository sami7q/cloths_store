import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory otherwise
  // makes Turbopack guess (and warn about) the wrong root.
  turbopack: { root: __dirname },
};

export default nextConfig;
