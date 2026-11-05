'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PREFERENCE_MAX_AGE_SECONDS } from '@/lib/i18n/locales';
import { TIME_ZONE_COOKIE } from '@/lib/writing/dates';

export function TimeZoneSync({ saved }: { saved: string | undefined }) {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (zone && zone !== saved) {
      document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=${PREFERENCE_MAX_AGE_SECONDS}; samesite=lax`;
      router.refresh();
    }
  }, [saved, router]);

  return null;
}
