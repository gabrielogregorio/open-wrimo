export function BookLoader({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-16 text-accent">
      <svg viewBox="0 0 120 80" className="h-24 w-36" aria-hidden="true" focusable="false">
        <path d="M60 14C44 6 26 6 8 12v58c18-6 36-6 52 2z" fill="var(--paper-deep)" stroke="var(--rule)" />
        <path d="M60 14c16-8 34-8 52-2v58c-18-6-36-6-52 2z" fill="var(--paper-deep)" stroke="var(--rule)" />
        <g fill="none" stroke="var(--ink-soft)" strokeLinecap="round" strokeWidth="1.5">
          <path className="ink-line" pathLength={1} d="M18 26c10-2 20-2 32 1" />
          <path className="ink-line" pathLength={1} d="M18 36c10-2 20-2 32 1" />
          <path className="ink-line" pathLength={1} d="M18 46c10-2 20-2 32 1" />
          <path className="ink-line" pathLength={1} d="M18 56c8-2 14-2 22 0" />
        </g>
        <path
          className="turning-leaf"
          d="M60 14c16-8 34-8 52-2v58c-18-6-36-6-52 2z"
          fill="var(--paper)"
          stroke="var(--rule)"
          opacity="0.9"
        />
        <path d="M60 14v58" stroke="var(--rule)" strokeWidth="1.5" />
      </svg>
      <p className="font-display text-sm text-ink-soft italic">{label}</p>
    </div>
  );
}
