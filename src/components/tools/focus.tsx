'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { logProgressAction } from '@/app/actions/writing';
import type { ToolData } from '@/lib/tools/data';
import { countWords } from '@/lib/tools/words';
import { useI18n } from '../i18n-provider';
import { DraftBar, useDraftSession } from './write/draft-session';
import { LogWords } from './write/log-words';
import { primaryButton, quietButton, toggleLabel, writingArea } from './write/styles';

const MIRRORED_STYLES = [
  'box-sizing',
  'width',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'line-height',
  'word-spacing',
  'text-indent',
  'tab-size',
];

// Where the caret sits inside the text, measured on an invisible copy of the text area.
export const caretOffset = (area: HTMLTextAreaElement): number => {
  const mirror = document.createElement('div');
  const style = window.getComputedStyle(area);

  for (const property of MIRRORED_STYLES) {
    mirror.style.setProperty(property, style.getPropertyValue(property));
  }

  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    top: '0',
    left: '-9999px',
  });
  mirror.textContent = area.value.slice(0, area.selectionStart);
  const marker = document.createElement('span');
  marker.textContent = '.';
  mirror.append(marker);
  document.body.append(mirror);
  const offset = marker.offsetTop + marker.offsetHeight / 2;
  mirror.remove();

  return offset;
};

// Typewriter mode: the line being written stays in the middle of the writing area.
export const centerCaret = (area: HTMLTextAreaElement): void => {
  area.scrollTop = Math.max(0, caretOffset(area) - area.clientHeight / 2);
};

const isDeletion = (event: Event): boolean => (event as InputEvent).inputType?.startsWith('delete') ?? false;

export default function Focus({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const session = useDraftSession('focus', t('Focus session {date}', { date: data.today }));
  const [immersive, setImmersive] = useState(false);
  const [typewriter, setTypewriter] = useState(false);
  const [noBackspace, setNoBackspace] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const words = countWords(session.text);
  const sessionWords = Math.max(0, words - session.baseline);

  useEffect(() => {
    const leave = (): void => {
      if (!document.fullscreenElement) {
        setImmersive(false);
      }
    };
    document.addEventListener('fullscreenchange', leave);

    return () => document.removeEventListener('fullscreenchange', leave);
  }, []);

  // On phones the keyboard shrinks the visible area without changing 100dvh, so the overlay follows it.
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!immersive || !viewport) {
      return undefined;
    }

    const follow = (): void => setViewportHeight(viewport.height);
    viewport.addEventListener('resize', follow);

    return () => viewport.removeEventListener('resize', follow);
  }, [immersive]);

  // Phone keyboards often send no Backspace key, only a "delete" input, so both are blocked.
  useEffect(() => {
    const target = area.current;

    if (!noBackspace || !target) {
      return undefined;
    }

    const block = (event: Event): void => {
      if (isDeletion(event)) {
        event.preventDefault();
      }
    };
    target.addEventListener('beforeinput', block);

    return () => target.removeEventListener('beforeinput', block);
  }, [noBackspace, session.ready]);

  const enter = (): void => {
    setImmersive(true);
    surface.current?.requestFullscreen?.().catch(() => undefined);
  };

  const leave = (): void => {
    setImmersive(false);
    setViewportHeight(null);

    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (noBackspace && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
    }

    if (event.key === 'Escape' && immersive) {
      leave();
    }
  };

  const follow = (): void => {
    if (typewriter && area.current) {
      centerCaret(area.current);
    }
  };

  const surfaceClass = immersive
    ? 'fixed inset-0 z-50 flex h-[100dvh] flex-col gap-2 bg-paper p-3'
    : 'sheet flex flex-col gap-3 rounded-sm p-4';
  const areaHeight = immersive ? 'min-h-0 flex-1' : 'h-[60dvh]';

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={surface}
        className={surfaceClass}
        style={immersive && viewportHeight ? { height: `${viewportHeight}px` } : undefined}
        data-testid="focus-surface">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="font-display text-sm font-semibold tabular-nums" aria-live="polite">
            {t('{count} words', { count: words })}
          </p>
          <label className={toggleLabel}>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={typewriter}
              onChange={() => setTypewriter(!typewriter)}
            />
            {t('Typewriter')}
          </label>
          <label className={toggleLabel}>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={noBackspace}
              onChange={() => setNoBackspace(!noBackspace)}
            />
            {t('No backspace')}
          </label>
          <span className="flex-1" />
          {immersive ? (
            <button type="button" className={quietButton} onClick={leave}>
              {t('Exit full screen')}
            </button>
          ) : (
            <button type="button" className={primaryButton} onClick={enter}>
              {t('Full screen')}
            </button>
          )}
        </div>
        <textarea
          ref={area}
          aria-label={t('Your text')}
          value={session.text}
          disabled={!session.ready}
          placeholder={t('Start writing…')}
          spellCheck
          onChange={(event) => {
            session.setText(event.target.value);
            follow();
          }}
          onSelect={follow}
          onKeyDown={onKeyDown}
          className={`${writingArea} ${areaHeight} ${typewriter ? 'py-[25dvh]' : ''}`}
        />
      </div>
      <DraftBar session={session} />
      <section className="sheet flex flex-col gap-3 rounded-sm p-4">
        <h2 className="font-display text-lg font-semibold">
          {t('{count} words in this session', { count: sessionWords })}
        </h2>
        <LogWords
          data={data}
          action={logProgressAction}
          countFor={() => sessionWords}
          onLogged={(_goalId, count) => session.setBaseline(session.baseline + count)}
          buttonLabel={(count) => t('Log {count} words', { count })}
        />
      </section>
    </div>
  );
}
