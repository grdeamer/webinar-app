import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ssh2"],
  async headers() {
    return [{ source: "/zoom/rtms", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://appssdk.zoom.us; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://appssdk.zoom.us; frame-ancestors 'self' https://*.zoom.us https://*.zoom.com; base-uri 'self'; object-src 'none'; form-action 'self'" },
    ] }]
  },
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
