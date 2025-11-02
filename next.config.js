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
  // Optimize CSS handling
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Ensure CSS is properly processed
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure CSS is loaded on client side
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.css$/,
        chunks: 'all',
        enforce: true,
      };
    }
    return config;
  },
}

module.exports = nextConfig


