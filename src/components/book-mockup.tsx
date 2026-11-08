'use client';

import type { PointerEvent } from 'react';
import { LogoMark } from './logo';

type BookMockupProps = {
  title: string;
  coverUrl: string | null;
  tilted?: boolean;
  /** Loads the cover only when it nears the screen; for long lists, not for the book a page opens on. */
  lazy?: boolean;
};

const TURN_Y = { from: -38, to: -8 };
const TURN_X = 6;

const follow = (event: PointerEvent<HTMLSpanElement>): void => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const box = event.currentTarget.getBoundingClientRect();
  const across = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  const down = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
  event.currentTarget.style.setProperty('--turn-y', `${TURN_Y.from + across * (TURN_Y.to - TURN_Y.from)}deg`);
  event.currentTarget.style.setProperty('--turn-x', `${(0.5 - down) * 2 * TURN_X}deg`);
};

const rest = (event: PointerEvent<HTMLSpanElement>): void => {
  event.currentTarget.style.removeProperty('--turn-y');
  event.currentTarget.style.removeProperty('--turn-x');
};

export function BookMockup({ title, coverUrl, tilted = true, lazy = false }: BookMockupProps) {
  return (
    <span
      className={`book-mock isolate select-none ${tilted ? '' : 'is-flat'}`}
      onDragStart={(event) => event.preventDefault()}
      onPointerMove={tilted ? follow : undefined}
      onPointerLeave={tilted ? rest : undefined}>
      <span className="book-mock-body">
        <span className="book-mock-back" aria-hidden="true" />
        <span className="book-mock-pages" aria-hidden="true" />
        <span className="book-mock-cover">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              draggable={false}
              loading={lazy ? 'lazy' : undefined}
              decoding="async"
              className="pointer-events-none h-full w-full object-cover"
            />
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
