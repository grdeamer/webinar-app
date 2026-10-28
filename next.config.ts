import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ssh2"],
  outputFileTracingExcludes: {
    "/*": ["./.env*", "./.git/**", "./.local/**", "./.next/lock", "./desktop/**", "./artifacts/**"],
  },
  outputFileTracingIncludes: {
    "/admin/events/*/producer/rehearsal/engine/*/**": ["./tools/production-local/**", "./node_modules/livekit-client/dist/livekit-client.umd.js"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hnowxleaxhprrjzcgcfq.supabase.co",
        pathname: "/storage/v1/object/public/upload/**",
      },
    ],
  },
};

export default nextConfig;
