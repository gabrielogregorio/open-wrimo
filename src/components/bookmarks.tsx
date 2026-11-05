'use client';

import { useActionState } from 'react';
import type { BookmarkView } from '@/lib/books/repository';
import type { FormState } from '@/lib/form';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';

type BookmarksProps = {
  bookmarks: BookmarkView[];
  addAction: (state: FormState, formData: FormData) => Promise<FormState>;
  removeAction: (bookmarkId: string) => Promise<void>;
};

export function Bookmarks({ bookmarks, addAction, removeAction }: BookmarksProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(addAction, {});
  const pageError = state.fieldErrors?.page;
  const noteError = state.fieldErrors?.note;

  return (
    <div className="flex flex-col gap-4">
      {bookmarks.length === 0 ? (
        <p className="text-sm text-ink-soft italic">{t('No bookmarks yet. Mark a page you want to come back to.')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookmarks.map((bookmark) => (
            <li key={bookmark.id} className="flex items-start gap-3 border-b border-dashed border-rule pb-2">
              <span className="ribbon mt-0.5 h-6 w-3 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-display text-sm font-semibold">{t('Page {page}', { page: bookmark.page })}</p>
                {bookmark.note ? <p className="text-sm">{bookmark.note}</p> : null}
              </div>
              <form action={removeAction.bind(null, bookmark.id)}>
                <button type="submit" className="text-xs text-ink-soft underline underline-offset-4 hover:text-danger">
                  {t('Remove bookmark on page {page}', { page: bookmark.page })}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form key={bookmarks.length} action={formAction} className="flex flex-col gap-3" noValidate>
        <FormAlert message={state.error ? t(state.error) : undefined} />
        <FormField
          label={t('Bookmark page')}
          name="page"
          type="number"
          inputMode="numeric"
          min={1}
          defaultValue={state.values?.page}
          error={pageError ? t(pageError) : undefined}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="field-note" className="font-display text-sm font-semibold">
            {t('Note')}
          </label>
          <textarea
            id="field-note"
            name="note"
            rows={2}
            defaultValue={state.values?.note}
            aria-invalid={noteError ? true : undefined}
            className={fieldClasses}
          />
          {noteError ? <p className="text-sm text-danger">{t(noteError)}</p> : null}
        </div>
        <SubmitButton variant="quiet">{t('Add bookmark')}</SubmitButton>
      </form>
    </div>
  );
}
