import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
