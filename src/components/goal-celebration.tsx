'use client';

import { useEffect, useState } from 'react';
import { playAchievementSound } from './achievement-sound';
import { launchConfetti } from './confetti';
import { useI18n } from './i18n-provider';

export type BeatenGoal = { key: string; name: string; novel: string; percent: number };

const SEEN_KEY = 'openwrimo-beaten-goals';
const BANNER_MS = 7000;

export function GoalCelebration({ beaten }: { beaten: BeatenGoal[] }) {
  const { t } = useI18n();
  const [shown, setShown] = useState<BeatenGoal | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(SEEN_KEY);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(beaten.map((goal) => goal.key)));

    if (!saved) {
      return undefined;
    }

    const seen = new Set(JSON.parse(saved) as string[]);
    const fresh = beaten.find((goal) => !seen.has(goal.key));

    if (!fresh) {
      return undefined;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- the celebrated goals live in localStorage, readable only after mount
    setShown(fresh);
    launchConfetti();
    void playAchievementSound('goal');
    const timer = window.setTimeout(() => setShown(null), BANNER_MS);

    return () => window.clearTimeout(timer);
  }, [beaten]);

  if (!shown) {
    return null;
  }

  return (
    <div
      role="status"
      className="goal-banner fixed top-20 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-1 rounded-sm border-2 border-[#e0a33a] bg-paper px-8 py-5 text-center shadow-2xl">
      <span className="text-4xl" aria-hidden="true">
        🎉
      </span>
      <span className="font-display text-3xl font-semibold text-accent">{t('Goal beaten!')}</span>
      <span className="text-ink-soft">
        {shown.name} · {shown.novel}
      </span>
      <span className="font-display text-xl text-[#a8641a]">{shown.percent}%</span>
      <button type="button" onClick={() => setShown(null)} className="mt-1 text-sm underline underline-offset-4">
        {t('Close')}
      </button>
    </div>
  );
}
