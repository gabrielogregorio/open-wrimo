import { LogoMark } from './logo';

type BookMockupProps = { title: string; coverUrl: string | null; tilted?: boolean };

export function BookMockup({ title, coverUrl, tilted = true }: BookMockupProps) {
  return (
    <span className={`book-mock isolate ${tilted ? '' : 'is-flat'}`}>
      <span className="book-mock-body">
        <span className="book-mock-back" aria-hidden="true" />
        <span className="book-mock-pages" aria-hidden="true" />
        <span className="book-mock-cover">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="book-cover-plain flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-sm font-semibold">{title}</span>
            </span>
          )}
        </span>
      </span>
    </span>
  );
}
