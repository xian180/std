import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/std",
  images: { unoptimized: true },
};

export default nextConfig;
