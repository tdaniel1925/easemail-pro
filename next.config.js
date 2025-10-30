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
}

module.exports = nextConfig


