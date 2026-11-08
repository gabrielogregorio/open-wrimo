'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDraft, makeDraftId, newDraft, writeDraftText, type Draft } from '@/lib/tools/drafts';
import { localDb } from '@/lib/tools/local-db';
import { countWords } from '@/lib/tools/words';
import { useI18n } from '../../i18n-provider';
import { quietButton } from './styles';

// Which draft each write tool had open, so a reload brings the same text back.
export const toolDraftKey = (toolId: string): string => `tool-draft:${toolId}`;

export const SAVE_DELAY_MS = 600;

type SaveState = 'idle' | 'saving' | 'saved';

export type DraftSession = {
  ready: boolean;
  text: string;
  setText: (text: string) => void;
  draft: Draft | null;
  baseline: number;
  setBaseline: (words: number) => void;
  saveState: SaveState;
  flush: () => Promise<Draft | null>;
  startNewDraft: () => Promise<void>;
};

// Keeps the text of a write tool in a draft on this device: saved a moment after each change, when the
// page is hidden or closed, and opened again on the next visit (or the one named in ?draft=).
export function useDraftSession(toolId: string, title: string): DraftSession {
  const [db] = useState(localDb);
  const [ready, setReady] = useState(false);
  const [text, setTextState] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const current = useRef<Draft | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const queue = useRef<Promise<Draft | null>>(Promise.resolve(null));

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      const requested = new URLSearchParams(window.location.search).get('draft');
      const draftId = requested ?? (await db.get<string>(toolDraftKey(toolId)));
      const found = draftId ? await loadDraft(db, draftId) : undefined;

      if (!active) {
        return;
      }

      if (found && !found.deletedAt) {
        current.current = found;
        setDraft(found);
        setTextState(found.text);
        setBaseline(countWords(found.text));
        await db.set(toolDraftKey(toolId), found.id);
      }

      setReady(true);
    };
    void load();

    return () => {
      active = false;
    };
  }, [db, toolId]);

  const flush = useCallback(async (): Promise<Draft | null> => {
    window.clearTimeout(timer.current);
    const value = pending.current;

    if (value === null) {
      return queue.current.then(() => current.current);
    }

    pending.current = null;
    const run = queue.current.then(async () => {
      const now = new Date();
      let target = current.current;

      if (!target) {
        target = newDraft({ id: makeDraftId(), title, now });
        await db.set(toolDraftKey(toolId), target.id);
      }

      const saved = await writeDraftText(db, target, value, now);
      current.current = saved;
      setDraft(saved);
      setSaveState('saved');

      return saved;
    });
    queue.current = run;

    return run;
  }, [db, title, toolId]);

  useEffect(() => {
    const save = (): void => {
      void flush();
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);

    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
      save();
    };
  }, [flush]);

  const save = (): void => {
    void flush();
  };

  const setText = (value: string): void => {
    setTextState(value);
    pending.current = value;
    setSaveState('saving');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_DELAY_MS);
  };

  const startNewDraft = async (): Promise<void> => {
    await flush();
    current.current = null;
    setDraft(null);
    setTextState('');
    setBaseline(0);
    setSaveState('idle');
    await db.remove(toolDraftKey(toolId));
  };

  return { ready, text, setText, draft, baseline, setBaseline, saveState, flush, startNewDraft };
}

export function DraftBar({ session }: { session: DraftSession }) {
  const { t } = useI18n();
  const statusText = {
    idle: t('Saved on this device as you type'),
    saving: t('Saving…'),
    saved: t('Saved on this device'),
  } satisfies Record<SaveState, string>;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="min-w-0 flex-1 text-ink-soft">
        <span className="font-display font-semibold text-ink">{session.draft?.title ?? t('New draft')}</span>
        <span aria-live="polite"> · {statusText[session.saveState]}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={quietButton}
          disabled={!session.draft && !session.text}
          onClick={() => void session.startNewDraft()}>
          {t('New draft')}
        </button>
        <Link href="/write/tools/drafts" className={quietButton}>
          {t('All drafts')}
        </Link>
      </div>
    </div>
  );
}
