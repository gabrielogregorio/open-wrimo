'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToolData } from '@/lib/tools/data';
import {
  DELETED_KEEP_MS,
  bringBack,
  deletedDrafts,
  liveDrafts,
  loadDrafts,
  loadSnapshots,
  makeDraftId,
  moveToDeleted,
  newDraft,
  nextOrder,
  purgeDeleted,
  restoreSnapshot,
  saveDraft,
  writeDraftText,
  type Draft,
  type Snapshot,
} from '@/lib/tools/drafts';
import { localDb, type LocalDb } from '@/lib/tools/local-db';
import { countWords } from '@/lib/tools/words';
import { fieldClasses } from '../form-field';
import { useI18n } from '../i18n-provider';
import { SAVE_DELAY_MS } from './write/draft-session';
import { primaryButton, quietButton, writingArea } from './write/styles';

const DAY_MS = 24 * 60 * 60_000;

export const daysLeft = (deletedAt: string, now: Date): number =>
  Math.max(1, Math.ceil((DELETED_KEEP_MS - (now.getTime() - new Date(deletedAt).getTime())) / DAY_MS));

type Listed = { drafts: Draft[]; now: Date };

// Removes drafts deleted more than seven days ago, then lists what is left.
const listDrafts = async (db: LocalDb): Promise<Listed> => {
  const now = new Date();
  await purgeDeleted(db, now);

  return { drafts: await loadDrafts(db), now };
};

type EditorProps = {
  db: LocalDb;
  draft: Draft;
  data: ToolData;
  onSaved: (draft: Draft) => void;
};

function DraftEditor({ db, draft, data, onSaved }: EditorProps) {
  const { t, locale } = useI18n();
  const [fields, setFields] = useState(draft);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);
  const latest = useRef(draft);
  const pendingText = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });

  const enqueue = useCallback(
    (work: () => Promise<Draft>): Promise<void> => {
      queue.current = queue.current.then(async () => {
        const saved = await work();
        latest.current = saved;
        onSaved(saved);
        setSnapshots(await loadSnapshots(db, saved.id));
      });

      return queue.current;
    },
    [db, onSaved],
  );

  const flushText = useCallback((): void => {
    window.clearTimeout(timer.current);
    const text = pendingText.current;

    if (text !== null) {
      pendingText.current = null;
      void enqueue(() => writeDraftText(db, latest.current, text, new Date()));
    }
  }, [db, enqueue]);

  useEffect(() => {
    void loadSnapshots(db, draft.id).then(setSnapshots);
  }, [db, draft.id]);

  useEffect(() => flushText, [flushText]);

  const changeMeta = (change: Partial<Pick<Draft, 'title' | 'novelId' | 'order'>>): void => {
    setFields({ ...fields, ...change });
    void enqueue(async () => {
      const updated = { ...latest.current, ...change, updatedAt: new Date().toISOString() };
      await saveDraft(db, updated);

      return updated;
    });
  };

  const changeText = (text: string): void => {
    setFields({ ...fields, text });
    pendingText.current = text;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flushText, SAVE_DELAY_MS);
  };

  const restore = (snapshot: Snapshot): void => {
    flushText();
    void enqueue(async () => {
      const restored = await restoreSnapshot(db, latest.current, snapshot, new Date());
      setFields((current) => ({ ...current, text: restored.text }));

      return restored;
    });
    setViewing(null);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-rule pt-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="flex flex-col gap-1 font-display text-sm font-semibold">
          {t('Title')}
          <input
            className={`${fieldClasses} min-h-11 font-normal`}
            value={fields.title}
            onChange={(event) => changeMeta({ title: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 font-display text-sm font-semibold">
          {t('Novel')}
          <select
            className={`${fieldClasses} min-h-11 font-normal`}
            value={fields.novelId ?? ''}
            onChange={(event) => changeMeta({ novelId: event.target.value || null })}>
            <option value="">{t('No novel')}</option>
            {data.novels.map((novel) => (
              <option key={novel.id} value={novel.id}>
                {novel.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-display text-sm font-semibold">
          {t('Chapter order')}
          <input
            className={`${fieldClasses} min-h-11 w-24 font-normal tabular-nums`}
            inputMode="numeric"
            value={fields.order}
            onChange={(event) => changeMeta({ order: Number(event.target.value.replace(/\D/g, '')) })}
          />
        </label>
      </div>
      <textarea
        aria-label={t('Text of {title}', { title: fields.title })}
        value={fields.text}
        spellCheck
        onChange={(event) => changeText(event.target.value)}
        className={`${writingArea} h-[45dvh]`}
      />
      <Link href={`/write/tools/focus?draft=${draft.id}`} className={`${quietButton} self-start`}>
        {t('Open in the focus editor')}
      </Link>
      <section className="flex flex-col gap-2" aria-label={t('Snapshots of the last hour')}>
        <h3 className="font-display text-sm font-semibold">{t('Snapshots of the last hour')}</h3>
        {snapshots.length === 0 ? <p className="text-sm text-ink-soft">{t('No snapshots yet.')}</p> : null}
        <ul className="flex flex-col gap-2">
          {snapshots.map((snapshot) => (
            <li key={snapshot.takenAt} className="flex flex-col gap-2 rounded-sm border border-rule p-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="flex-1 tabular-nums">
                  {t('{time} · {count} words', {
                    time: time.format(new Date(snapshot.takenAt)),
                    count: countWords(snapshot.text),
                  })}
                </span>
                <button
                  type="button"
                  className={quietButton}
                  aria-expanded={viewing === snapshot.takenAt}
                  onClick={() => setViewing(viewing === snapshot.takenAt ? null : snapshot.takenAt)}>
                  {viewing === snapshot.takenAt ? t('Hide') : t('View')}
                </button>
                <button type="button" className={quietButton} onClick={() => restore(snapshot)}>
                  {t('Restore')}
                </button>
              </div>
              {viewing === snapshot.takenAt ? (
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-serif text-sm">{snapshot.text}</pre>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function Drafts({ data }: { data: ToolData }) {
  const { t } = useI18n();
  const [db] = useState(localDb);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const show = useCallback((listed: Listed): void => {
    setDrafts(listed.drafts);
    setNow(listed.now);
  }, []);

  const refresh = async (): Promise<void> => show(await listDrafts(db));

  useEffect(() => {
    void listDrafts(db).then(show);
  }, [db, show]);

  const onSaved = useCallback((saved: Draft): void => {
    setDrafts((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }, []);

  if (!now) {
    return <p className="sheet rounded-sm p-6 text-ink-soft">{t('Opening your drafts…')}</p>;
  }

  const live = liveDrafts(drafts);
  const deleted = deletedDrafts(drafts, now);
  const groups = [...new Set(live.map((draft) => draft.novelId))];
  const novelTitle = (novelId: string | null): string => {
    if (!novelId) {
      return t('No novel');
    }

    return data.novels.find((novel) => novel.id === novelId)?.title ?? t('A novel not found');
  };

  const create = async (): Promise<void> => {
    const draft = newDraft({
      id: makeDraftId(),
      title: t('Untitled draft'),
      now: new Date(),
      order: nextOrder(drafts, null),
    });
    await saveDraft(db, draft);
    await refresh();
    setOpenId(draft.id);
  };

  const remove = async (draft: Draft): Promise<void> => {
    await moveToDeleted(db, draft, new Date());
    setConfirmId(null);
    setOpenId(null);
    await refresh();
  };

  const restore = async (draft: Draft): Promise<void> => {
    await bringBack(db, draft);
    await refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={primaryButton} onClick={() => void create()}>
          {t('New draft')}
        </button>
        <p className="text-sm text-ink-soft">
          {t('Saved only on this device. A snapshot every 5 minutes while you write.')}
        </p>
      </div>
      {live.length === 0 ? <p className="sheet rounded-sm p-6 text-ink-soft">{t('No drafts yet.')}</p> : null}
      {groups.map((novelId) => (
        <section key={novelId ?? 'none'} className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">{novelTitle(novelId)}</h2>
          <ul className="flex flex-col gap-3">
            {live
              .filter((draft) => draft.novelId === novelId)
              .map((draft) => (
                <li key={draft.id} className="sheet flex flex-col gap-3 rounded-sm p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-semibold break-words">{draft.title}</p>
                      <p className="text-sm text-ink-soft tabular-nums">
                        {t('{count} words', { count: countWords(draft.text) })}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={quietButton}
                      aria-expanded={openId === draft.id}
                      onClick={() => setOpenId(openId === draft.id ? null : draft.id)}>
                      {openId === draft.id ? t('Close') : t('Open')}
                    </button>
                    <button type="button" className={quietButton} onClick={() => setConfirmId(draft.id)}>
                      {t('Delete')}
                    </button>
                  </div>
                  {confirmId === draft.id ? (
                    <div role="alert" className="flex flex-col gap-2 rounded-sm border border-danger p-3 text-sm">
                      <p>{t('Delete “{title}”? You can bring it back for 7 days.', { title: draft.title })}</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={`${quietButton} border-danger text-danger`}
                          onClick={() => void remove(draft)}>
                          {t('Yes, delete')}
                        </button>
                        <button type="button" className={quietButton} onClick={() => setConfirmId(null)}>
                          {t('Keep it')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {openId === draft.id ? <DraftEditor db={db} draft={draft} data={data} onSaved={onSaved} /> : null}
                </li>
              ))}
          </ul>
        </section>
      ))}
      {deleted.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">{t('Recently deleted')}</h2>
          <ul className="flex flex-col gap-2">
            {deleted.map((draft) => (
              <li key={draft.id} className="sheet flex flex-wrap items-center gap-2 rounded-sm p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold break-words">{draft.title}</p>
                  <p className="text-sm text-ink-soft">
                    {t('Gone for good in {count} days', { count: daysLeft(String(draft.deletedAt), now) })}
                  </p>
                </div>
                <button type="button" className={quietButton} onClick={() => void restore(draft)}>
                  {t('Bring back')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
