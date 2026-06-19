import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@ndsc/auth"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
