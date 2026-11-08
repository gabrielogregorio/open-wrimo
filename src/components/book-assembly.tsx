import type { CSSProperties } from 'react';

// Shown for a moment on every page change: the spine stands up with the cover open,
// the leaves drop onto the back board, the cover closes over them and the title is inked. It never takes clicks and is hidden from screen readers.
const LEAVES = [0, 1, 2, 3];

export function BookAssembly() {
  return (
    <div className="book-assembly" aria-hidden="true">
      <svg viewBox="-34 0 188 100" className="h-36 w-auto" focusable="false">
        <rect className="assembly-board" x="30" y="12" width="62" height="76" rx="3" fill="var(--ribbon)" />
        {LEAVES.map((leaf) => (
          <rect
            key={leaf}
            className="assembly-leaf"
            style={{ '--leaf': leaf } as CSSProperties}
            x={33 + leaf}
            y={14 + leaf * 0.5}
            width={56 - leaf}
            height={72 - leaf}
            rx="1.5"
            fill={leaf % 2 === 0 ? 'var(--paper)' : 'var(--paper-deep)'}
            stroke="var(--rule)"
            strokeWidth="0.6"
          />
        ))}
        <rect className="assembly-cover" x="28" y="10" width="62" height="76" rx="3" fill="var(--accent)" />
        <rect className="assembly-spine" x="22" y="10" width="9" height="76" rx="2" fill="var(--ribbon)" />
        <g className="assembly-title" fill="none" stroke="var(--accent-ink)" strokeLinecap="round" strokeWidth="2">
          <path pathLength={1} d="M42 34h36" />
          <path pathLength={1} d="M47 43h26" />
        </g>
        <path className="assembly-ribbon" d="M74 86v10l3-3 3 3V86z" fill="var(--rule)" />
      </svg>
    </div>
  );
}
