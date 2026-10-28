import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ssh2"],
  outputFileTracingIncludes: {
    "/admin/events/*/producer/rehearsal/engine/*/**": ["./tools/production-local/**", "./lib/production/**", "./lib/live/producerControl.ts", "./scripts/production-producer-hosted.ts", "./node_modules/livekit-client/dist/livekit-client.umd.js"],
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
