/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['raw.githubusercontent.com'],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true, // Allow images from data URLs
  },
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Disable React strict mode
  reactStrictMode: false,
};

module.exports = nextConfig; 