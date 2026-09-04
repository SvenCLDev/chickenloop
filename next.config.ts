import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const cutover = process.env.TALENT_NETWORK_CUTOVER === 'true';
    const createDestination = cutover
      ? '/job-seeker/profile/talent-network/new'
      : '/job-seeker/profile/new';

    const legacyCvPageRedirects = [
      { source: '/kitesurf-center-directory', destination: '/companies', permanent: true },
      { source: '/candidates', destination: '/talent', permanent: true },
      { source: '/candidates/:id', destination: '/talent/:id', permanent: true },
      { source: '/create-cv', destination: '/create-profile', permanent: false },
      { source: '/create-profile', destination: createDestination, permanent: false },
      { source: '/job-seeker/cv/new', destination: '/job-seeker/profile/new', permanent: false },
      { source: '/job-seeker/cv/edit', destination: '/job-seeker/profile/edit', permanent: false },
      { source: '/job-seeker/cv/view', destination: '/job-seeker/profile/view', permanent: false },
      {
        source: '/job-seeker/cv/talent-network/new',
        destination: '/job-seeker/profile/talent-network/new',
        permanent: false,
      },
      {
        source: '/job-seeker/cv/talent-network/edit',
        destination: '/job-seeker/profile/talent-network/edit',
        permanent: false,
      },
      { source: '/admin/cvs/:id/edit', destination: '/admin/profiles/:id/edit', permanent: false },
    ];

    const cutoverRedirects = cutover
      ? [
          {
            source: '/job-seeker/profile/edit',
            destination: '/job-seeker/profile/talent-network/edit',
            permanent: false,
          },
          {
            source: '/job-seeker/profile/new',
            destination: '/job-seeker/profile/talent-network/new',
            permanent: false,
          },
        ]
      : [];

    return [...legacyCvPageRedirects, ...cutoverRedirects];
  },
  async rewrites() {
    return [
      { source: '/api/cv/:path*', destination: '/api/profile/:path*' },
      { source: '/api/admin/cvs/:path*', destination: '/api/admin/profiles/:path*' },
      { source: '/api/stripe/cv-boost/:path*', destination: '/api/stripe/profile-boost/:path*' },
      { source: '/api/stripe/cv-boost-prices', destination: '/api/stripe/profile-boost-prices' },
    ];
  },
  // Performance optimizations for dev server
  typescript: {
    // Faster TypeScript compilation
    ignoreBuildErrors: false,
  },
  // Enable faster refresh
  reactStrictMode: true,
  // Faster development builds
  compiler: {
    // Remove console logs in production (optional)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Experimental features for better performance
  experimental: {
    // Optimize package imports - add commonly used packages
    optimizePackageImports: ['react', 'react-dom', 'mongoose', 'bcryptjs', 'jsonwebtoken'],
    // Note: optimizeCss requires 'critters' package - disabled for now to avoid build issues
    // optimizeCss: true,
  },
  // Enable compression for better performance
  compress: true,
  // Performance optimizations
  poweredByHeader: false, // Remove X-Powered-By header for security and slight performance gain
  // Optimize production builds
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller builds
  // Allow images from Vercel Blob Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
    // Image optimization settings
    formats: ['image/avif', 'image/webp'], // Use modern formats for better compression
    minimumCacheTTL: 3600, // Cache optimized images for 1 hour
    qualities: [60, 75, 85], // 85 used for marketing banners
  },
};

export default nextConfig;
