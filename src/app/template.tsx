import type { ReactNode } from 'react';
import { BookAssembly } from '@/components/book-assembly';

export default function Template({ children }: { children: ReactNode }) {
  return (
    <>
      <BookAssembly />
      <div className="page-enter">{children}</div>
    </>
  );
}
