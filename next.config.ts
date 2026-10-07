import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const LOCALE = 'en|de|es';

const nextConfig: NextConfig = {
  async redirects() {
    const cutover = process.env.TALENT_NETWORK_CUTOVER === 'true';
    const createDestination = cutover
      ? '/job-seeker/profile/talent-network/new'
      : '/job-seeker/profile/new';

    const legacyCvPageRedirects = [
      {
        source: `/:locale(${LOCALE})/kitesurf-center-directory`,
        destination: '/:locale/companies',
        permanent: true,
      },
      {
        source: `/:locale(${LOCALE})/candidates`,
        destination: '/:locale/talent',
        permanent: true,
      },
      {
        source: `/:locale(${LOCALE})/candidates/:id`,
        destination: '/:locale/talent/:id',
        permanent: true,
      },
      {
        source: `/:locale(${LOCALE})/create-cv`,
        destination: `/:locale/create-profile`,
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/create-profile`,
        destination: `/:locale${createDestination}`,
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/job-seeker/cv/new`,
        destination: '/:locale/job-seeker/profile/new',
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/job-seeker/cv/edit`,
        destination: '/:locale/job-seeker/profile/edit',
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/job-seeker/cv/view`,
        destination: '/:locale/job-seeker/profile/view',
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/job-seeker/cv/talent-network/new`,
        destination: '/:locale/job-seeker/profile/talent-network/new',
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/job-seeker/cv/talent-network/edit`,
        destination: '/:locale/job-seeker/profile/talent-network/edit',
        permanent: false,
      },
      {
        source: `/:locale(${LOCALE})/admin/cvs/:id/edit`,
        destination: '/:locale/admin/profiles/:id/edit',
        permanent: false,
      },
      // Unprefixed legacy URLs → default locale (middleware also prefixes unknowns)
      { source: '/kitesurf-center-directory', destination: '/en/companies', permanent: true },
      { source: '/candidates', destination: '/en/talent', permanent: true },
      { source: '/candidates/:id', destination: '/en/talent/:id', permanent: true },
      { source: '/create-cv', destination: `/en/create-profile`, permanent: false },
      { source: '/create-profile', destination: `/en${createDestination}`, permanent: false },
    ];

    const cutoverRedirects = cutover
      ? [
          {
            source: `/:locale(${LOCALE})/job-seeker/profile/edit`,
            destination: '/:locale/job-seeker/profile/talent-network/edit',
            permanent: false,
          },
          {
            source: `/:locale(${LOCALE})/job-seeker/profile/new`,
            destination: '/:locale/job-seeker/profile/talent-network/new',
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
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },
  experimental: {
    optimizePackageImports: [
      'react',
      'react-dom',
      'mongoose',
      'bcryptjs',
      'jsonwebtoken',
      'next-intl',
    ],
  },
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
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
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    qualities: [60, 75, 85],
  },
};

export default withNextIntl(nextConfig);
