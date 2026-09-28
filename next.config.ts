import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  poweredByHeader: false,

  outputFileTracingRoot: process.cwd(),

  turbopack: { root: process.cwd() },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  },

  async rewrites() {
    if (process.env.VERCEL === '1') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.BACKEND_URL}/api/:path*`
        }
      ];
    }

    return [];
  }
};

export default nextConfig;