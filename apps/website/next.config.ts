import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@ndsc/auth'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
