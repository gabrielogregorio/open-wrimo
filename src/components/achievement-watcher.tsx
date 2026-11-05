'use client';

import { useEffect, useState } from 'react';
import type { Badge } from '@/lib/writing/badges';
import { BadgeIcon, type BadgeKind } from './badge-hex';
import { SOUND_SETTING, playAchievementSound, soundForBadge, soundIsOn } from './achievement-sound';
import { useI18n } from './i18n-provider';

export type EarnedAchievement = { key: string; kind: BadgeKind; badge: Badge; label: string; novel: string };

const SEEN_KEY = 'openwrimo-seen-achievements';
const TOAST_MS = 6000;

const readSeen = (): Set<string> | null => {
  const saved = window.localStorage.getItem(SEEN_KEY);

  return saved ? new Set(JSON.parse(saved) as string[]) : null;
};

export function AchievementWatcher({ earned }: { earned: EarnedAchievement[] }) {
  const { t } = useI18n();
  const [queue, setQueue] = useState<EarnedAchievement[]>([]);
  const [soundOn, setSoundOn] = useState(() => typeof window === 'undefined' || soundIsOn());

  useEffect(() => {
    const seen = readSeen();
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(earned.map((item) => item.key)));

    if (!seen) {
      return;
    }

    const fresh = earned.filter((item) => !seen.has(item.key));

    if (fresh.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the seen list lives in localStorage, readable only after mount
      setQueue((current) => [...current, ...fresh]);
      void playAchievementSound(soundForBadge(fresh[0].kind, fresh[0].badge.id));
    }
  }, [earned]);

  useEffect(() => {
    if (queue.length === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setQueue((current) => current.slice(1));
    }, TOAST_MS);

    return () => window.clearTimeout(timer);
  }, [queue]);

  const toggleSound = (): void => {
    const next = !soundOn;
    window.localStorage.setItem(SOUND_SETTING, next ? 'on' : 'off');
    setSoundOn(next);
  };

  const current = queue[0];

  if (!current) {
    return null;
  }

  return (
    <div
      role="status"
      className="achievement-toast fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-4 rounded-sm border border-accent bg-paper p-4 shadow-2xl">
      <span className="badge-earned shrink-0">
        <BadgeIcon badge={current.badge} kind={current.kind} className="h-16 w-16" />
      </span>
      <span className="flex flex-col gap-1">
        <span className="font-display text-xs tracking-[0.25em] text-accent uppercase">
          {t('Achievement unlocked!')}
        </span>
        <span className="font-display text-lg font-semibold">{current.label}</span>
        <span className="text-sm text-ink-soft">{current.novel}</span>
        <span className="flex gap-3 text-xs">
          <button type="button" onClick={() => setQueue(queue.slice(1))} className="underline underline-offset-4">
            {queue.length > 1 ? t('Next ({count})', { count: queue.length - 1 }) : t('Close')}
          </button>
          <button type="button" onClick={toggleSound} className="underline underline-offset-4">
            {soundOn ? t('Mute sounds') : t('Turn sounds on')}
          </button>
        </span>
      </span>
    </div>
  );
}
