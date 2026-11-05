import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';

const DECORATIVE_SPINES = [
  { tone: 0, width: 2.4, height: 12.5 },
  { tone: 3, width: 3, height: 13.5 },
  { tone: 1, width: 2.1, height: 11.5 },
  { tone: 5, width: 2.8, height: 13 },
  { tone: 2, width: 2.3, height: 12 },
  { tone: 7, width: 3.2, height: 13.5 },
  { tone: 4, width: 2, height: 11 },
  { tone: 6, width: 2.6, height: 12.5 },
] as const;

export default async function HomePage() {
  if (await getCurrentUser()) {
    redirect('/write');
  }

  const t = await getTranslator();

  return (
    <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-6">
        <p className="font-display text-sm tracking-[0.3em] text-accent uppercase">{t('Your writing notebook')}</p>
        <h1 className="font-display text-4xl leading-tight font-semibold text-balance sm:text-5xl">
          {t('A quiet place to write your novel.')}
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-ink-soft">
          {t('Set a goal, log your words every day, run sprints, earn badges and watch your book grow.')}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-sm bg-accent px-5 py-2.5 font-display font-semibold text-accent-ink hover:brightness-110">
            {t('Create account')}
          </Link>
          <Link href="/login" className="rounded-sm border border-rule px-5 py-2.5 font-display font-semibold">
            {t('Sign in')}
          </Link>
        </div>
      </div>
      <div aria-hidden="true">
        <div className="flex items-end justify-center gap-1.5 px-6">
          {DECORATIVE_SPINES.map((spine) => (
            <div
              key={spine.tone}
              data-tone={spine.tone}
              className="spine rounded-t-sm shadow-md"
              style={{ width: `${spine.width}rem`, height: `${spine.height}rem` }}
            />
          ))}
        </div>
        <div className="shelf-board h-4 rounded-sm" />
      </div>
    </div>
  );
}
