import type { NextConfig } from "next";

const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  ...(isCapacitorBuild
    ? {
        output: 'export',
        images: { unoptimized: true },
        // Disable features incompatible with static export
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
