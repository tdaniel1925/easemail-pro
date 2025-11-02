/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.nylas.com', 'api.aurinko.io'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Optimize CSS loading to prevent styling issues during restarts
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Ensure CSS is always processed before JS in development
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
      };
    }
    return config;
  },
  // Improve HMR stability
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig


