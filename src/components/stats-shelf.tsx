'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CoverShelf, type ShelfBook } from './cover-shelf';
import { useI18n } from './i18n-provider';

export type StatsBook = ShelfBook & { goals: { id: string; label: string }[] };

export function StatsShelf({ books, goalId }: { books: StatsBook[]; goalId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const current = Math.max(
    0,
    books.findIndex((book) => book.goals.some((goal) => goal.id === goalId)),
  );
  const [selected, setSelected] = useState(current);
  const book = books[selected];

  const choose = (index: number): void => {
    setSelected(index);
    router.push(`/write/stats?goal=${books[index].goals[0].id}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3">
      <CoverShelf books={books} selected={selected} onSelect={choose} />
      <nav aria-label={t('Goal')} className="flex flex-wrap justify-center gap-2 text-sm">
        {book.goals.map((goal) => (
          <Link
            key={goal.id}
            href={`/write/stats?goal=${goal.id}`}
            scroll={false}
            aria-current={goal.id === goalId ? 'page' : undefined}
            className={`rounded-full border px-3 py-1 ${goal.id === goalId ? 'border-accent bg-accent text-accent-ink' : 'border-rule hover:bg-paper'}`}>
            {goal.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
