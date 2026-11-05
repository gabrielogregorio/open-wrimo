import { readingPercent } from '@/lib/books/progress';

type ProgressBarProps = { currentPage: number; totalPages: number; label: string };

export function ProgressBar({ currentPage, totalPages, label }: ProgressBarProps) {
  const percent = readingPercent(currentPage, totalPages);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-rule">
      <div className="ink-fill h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}
