'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { fieldClasses } from '@/components/form-field';
import { useI18n } from '@/components/i18n-provider';
import { localDb } from '@/lib/tools/local-db';

// The four review tools share the pasted passage, so it is pasted once and survives a reload.
export const REVIEW_TEXT_KEY = 'review:text';

type ReviewToolProps = { children: (text: string) => ReactNode; delay?: number };

export function ReviewTool({ children, delay = 300 }: ReviewToolProps) {
  const { t } = useI18n();
  const id = useId();
  const [text, setText] = useState('');
  const [analyzed, setAnalyzed] = useState('');
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    void localDb()
      .get<string>(REVIEW_TEXT_KEY)
      .then((saved) => {
        setText(saved ?? '');
        setAnalyzed(saved ?? '');
        setLoaded(true);
      });
  }, []);

  const change = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAnalyzed(value);
      void localDb().set(REVIEW_TEXT_KEY, value);
    }, delay);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="sheet flex flex-col gap-2 rounded-sm p-4">
        <label htmlFor={id} className="font-display text-sm font-semibold">
          {t('Your passage')}
        </label>
        <textarea
          id={id}
          value={text}
          disabled={!loaded}
          onChange={(event) => change(event.target.value)}
          rows={8}
          placeholder={t('Paste a chapter or a scene here.')}
          className={`${fieldClasses} min-h-48 font-serif leading-relaxed`}
        />
        <p className="text-xs text-ink-soft">
          {t('The text stays on this device and is shared by the four review tools.')}
        </p>
      </div>
      {analyzed.trim() ? (
        <div aria-live="polite" className="flex flex-col gap-5">
          {children(analyzed)}
        </div>
      ) : (
        <p className="text-center text-ink-soft">{t('Paste a passage to see the analysis.')}</p>
      )}
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="sheet flex flex-col rounded-sm p-3">
      <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
      <span className="text-sm text-ink-soft">{label}</span>
    </div>
  );
}
