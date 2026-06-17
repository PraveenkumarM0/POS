import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // any HTTPS host (covers remote backend, Unsplash, CDNs, etc.)
      { protocol: 'https', hostname: '**' },
      // local backend (HTTP)
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    unoptimized: true,
  },
};
export default nextConfig;
