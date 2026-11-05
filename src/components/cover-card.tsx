'use client';

import { useState } from 'react';
import { useI18n } from './i18n-provider';
import { LogoMark } from './logo';

const plainText = (html: string): string => {
  let text = '';
  let insideTag = false;

  for (const character of html) {
    if (character === '<') {
      insideTag = true;
    } else if (character === '>') {
      insideTag = false;
      text += ' ';
    } else if (!insideTag) {
      text += character;
    }
  }

  return text.split(' ').filter(Boolean).join(' ');
};

type CoverCardProps = { title: string; coverUrl: string | null; summary: string; excerpt: string };

export function CoverCard({ title, coverUrl, summary, excerpt }: CoverCardProps) {
  const { t } = useI18n();
  const [showBack, setShowBack] = useState(false);

  return (
    <div className="cover-scene w-40 shrink-0 sm:w-48">
      <button
        type="button"
        onClick={() => setShowBack(!showBack)}
        aria-pressed={showBack}
        aria-label={showBack ? t('Show the cover of {title}', { title }) : t('Turn {title} over', { title })}
        className={`cover-flip relative block aspect-[2/3] w-full ${showBack ? 'is-flipped' : ''}`}>
        <span className="cover-face absolute inset-0 overflow-hidden rounded-sm shadow-lg">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="book-cover-plain flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
              <LogoMark className="h-8 w-8" />
              <span className="font-display text-sm font-semibold">{title}</span>
            </span>
          )}
        </span>
        <span className="cover-face cover-back absolute inset-0 overflow-y-auto rounded-sm bg-paper p-3 text-left text-xs shadow-lg">
          <span className="block font-display font-semibold">{t('Summary')}</span>
          <span className="block whitespace-pre-line">{summary || t('No summary yet.')}</span>
          <span className="mt-2 block font-display font-semibold">{t('Excerpt')}</span>
          <span className="block whitespace-pre-line italic">{plainText(excerpt) || t('No excerpt yet.')}</span>
        </span>
      </button>
    </div>
  );
}
