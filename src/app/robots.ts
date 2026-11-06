import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/server/seo';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/$', '/login', '/register', '/u/'],
      disallow: ['/write', '/media', '/api'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl().host,
  };
}
