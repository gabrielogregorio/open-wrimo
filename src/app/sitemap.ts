import type { MetadataRoute } from 'next';
import { getDatabase } from '@/lib/db/client';
import { createWritingRepository } from '@/lib/writing/repository';
import { absoluteUrl } from '@/server/seo';

export const dynamic = 'force-dynamic';

const PROFILES_PER_PAGE = 24;
const MAX_PROFILE_PAGES = 200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/register'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/login'), lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
  const writing = createWritingRepository(await getDatabase());

  for (let page = 1; page <= MAX_PROFILE_PAGES; page += 1) {
    const { writers, total } = await writing.listCommunity({ query: '', sort: 'recent', page });

    for (const writer of writers) {
      pages.push({
        url: absoluteUrl(`/u/${writer.username}`),
        lastModified: writer.lastWrote ? new Date(`${writer.lastWrote}T12:00:00Z`) : now,
        changeFrequency: 'daily',
        priority: 0.5,
      });
    }

    if (page * PROFILES_PER_PAGE >= total) {
      break;
    }
  }

  return pages;
}
