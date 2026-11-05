import type { ReactNode } from 'react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="sheet relative rounded-sm px-8 pt-10 pb-8">
        <span className="ribbon absolute top-0 right-8 h-14 w-5" aria-hidden="true" />
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-2 mb-6 text-ink-soft">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
