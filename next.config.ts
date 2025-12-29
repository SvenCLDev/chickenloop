import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
      },
    ],
    // Image optimization settings
    formats: ['image/avif', 'image/webp'], // Use modern formats for better compression
    minimumCacheTTL: 3600, // Cache optimized images for 1 hour
  },
};

export default nextConfig;
