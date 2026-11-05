'use client';

import { useActionState } from 'react';
import type { BookView } from '@/lib/books/repository';
import { BOOK_STATUSES, MAX_RATING } from '@/lib/books/schema';
import type { FormState } from '@/lib/form';
import { STATUS_LABELS } from './book-status';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';

type BookFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  book?: BookView;
};

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

export function BookForm({ action, book }: BookFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? initialValues(book);
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <FormAlert message={state.error ? t(state.error) : undefined} />
      </div>
      <div className="sm:col-span-2">
        <FormField label={t('Title')} name="title" defaultValue={values.title} error={fieldError('title')} required />
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
      <div className="sm:col-span-2">
        <SubmitButton>{book ? t('Save changes') : t('Add to shelf')}</SubmitButton>
      </div>
    </form>
  );
}
