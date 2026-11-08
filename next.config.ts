import type { NextConfig } from 'next';

const ONE_YEAR_IN_SECONDS = 31536000;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: `max-age=${ONE_YEAR_IN_SECONDS}; includeSubDomains` },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  // The dev server keeps its own folder, so a production build (e2e, Lighthouse) never leaves it out of sync.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  agentRules: false,
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  poweredByHeader: false,
  serverExternalPackages: ['mongodb'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
