'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useState, type MouseEvent } from 'react';
import type { BookView } from '@/lib/books/repository';
import { BOOK_STATUSES, MAX_RATING } from '@/lib/books/schema';
import type { FormState } from '@/lib/form';
import { STATUS_LABELS } from './book-status';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { LogoMark } from './logo';
import { SubmitButton } from './submit-button';

type BookFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  title: string;
  cancelHref: string;
  book?: BookView;
};

export const CRUMPLE_MS = 900;

const prefersReducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const RATINGS = Array.from({ length: MAX_RATING }, (_unused, index) => index + 1);

const initialValues = (book?: BookView): Record<string, string> => ({
  title: book?.title ?? '',
  author: book?.author ?? '',
  totalPages: book ? String(book.totalPages) : '',
  currentPage: book ? String(book.currentPage) : '0',
  status: book?.status ?? 'want',
  rating: book?.rating ? String(book.rating) : '',
  notes: book?.notes ?? '',
});

export function BookForm({ action, title, cancelHref, book }: BookFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction] = useActionState(action, {});
  const [crumpled, setCrumpled] = useState(false);
  const values = state.values ?? initialValues(book);
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  const cancel = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    setCrumpled(true);
    window.setTimeout(() => router.push(cancelHref), prefersReducedMotion() ? 0 : CRUMPLE_MS);
  };

  return (
    <div className="book-stage mx-auto max-w-2xl">
      <div className={`sheet relative rounded-sm p-8 ${crumpled ? 'crumple' : ''}`} data-testid="book-sheet">
        <h1 className="mb-6 font-display text-3xl font-semibold">{title}</h1>
        <form action={formAction} className="grid gap-5 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2">
            <FormAlert message={state.error ? t(state.error) : undefined} />
          </div>
          <div className="sm:col-span-2">
            <FormField
              label={t('Title')}
              name="title"
              defaultValue={values.title}
              error={fieldError('title')}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <FormField
              label={t('Author')}
              name="author"
              defaultValue={values.author}
              error={fieldError('author')}
              required
            />
          </div>
          <FormField
            label={t('Total pages')}
            name="totalPages"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={values.totalPages}
            error={fieldError('totalPages')}
            required
          />
          <FormField
            label={t('Current page')}
            name="currentPage"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={values.currentPage}
            error={fieldError('currentPage')}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="field-status" className="font-display text-sm font-semibold">
              {t('Status')}
            </label>
            <select id="field-status" name="status" defaultValue={values.status} className={fieldClasses}>
              {BOOK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(STATUS_LABELS[status])}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="field-rating" className="font-display text-sm font-semibold">
              {t('Rating')}
            </label>
            <select
              id="field-rating"
              name="rating"
              defaultValue={values.rating}
              aria-invalid={fieldError('rating') ? true : undefined}
              className={fieldClasses}>
              <option value="">{t('No rating')}</option>
              {RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {t('{count} of 5 stars', { count: rating })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="field-notes" className="font-display text-sm font-semibold">
              {t('Notes')}
            </label>
            <textarea
              id="field-notes"
              name="notes"
              rows={5}
              defaultValue={values.notes}
              aria-invalid={fieldError('notes') ? true : undefined}
              aria-describedby={fieldError('notes') ? 'field-notes-error' : undefined}
              className={fieldClasses}
            />
            {fieldError('notes') ? (
              <p id="field-notes-error" className="text-sm text-danger">
                {fieldError('notes')}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <SubmitButton>{book ? t('Save changes') : t('Add to shelf')}</SubmitButton>
            <Link
              href={cancelHref}
              onClick={cancel}
              className="font-display text-sm text-ink-soft underline underline-offset-4">
              {t('Cancel')}
            </Link>
          </div>
        </form>
      </div>
      {book ? null : (
        <div className="book-cover" aria-hidden="true" data-testid="book-cover">
          <LogoMark className="h-14 w-14" />
          <span className="font-display text-2xl font-semibold tracking-wide">Open Wrimo</span>
        </div>
      )}
    </div>
  );
}
