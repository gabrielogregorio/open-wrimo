import { BookMockup } from './book-mockup';

export function CoverCard({ title, coverUrl }: { title: string; coverUrl: string | null }) {
  return (
    <div className="w-40 shrink-0 sm:w-44">
      <BookMockup title={title} coverUrl={coverUrl} />
    </div>
  );
}
