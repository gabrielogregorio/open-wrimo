'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { EVENT_IDS } from '@/lib/writing/events';
import type { ProjectView } from '@/lib/writing/repository';
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/lib/writing/schema';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { GenreInput } from './genre-input';
import { useI18n } from './i18n-provider';
import { ImageField } from './image-field';
import { RichTextEditor } from './rich-text-editor';
import { SubmitButton } from './submit-button';
import { EVENT_LABELS, PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from './writing-labels';

type NovelFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  novel?: ProjectView;
  initialError?: string;
};

const initialValues = (novel?: ProjectView): Record<string, string> => ({
  title: novel?.title ?? '',
  status: novel?.status ?? 'not-started',
  type: novel?.type ?? 'novel',
  genres: novel?.genres.join(', ') ?? '',
  summary: novel?.summary ?? '',
  excerpt: novel?.excerpt ?? '',
  pinterestUrl: novel?.pinterestUrl ?? '',
  playlistUrl: novel?.playlistUrl ?? '',
  featured: novel?.featured ? 'on' : '',
  event: '',
});

function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: [string, string][];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field-${name}`} className="font-display text-sm font-semibold">
        {label}
      </label>
      <select id={`field-${name}`} name={name} defaultValue={value} className={fieldClasses}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({
  name,
  label,
  value,
  rows,
  error,
}: {
  name: string;
  label: string;
  value: string;
  rows: number;
  error?: string;
}) {
  const id = `field-${name}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClasses}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function NovelForm({ action, cancelHref, novel, initialError }: NovelFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? initialValues(novel);
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert message={state.error ? t(state.error) : initialError} />
      <FormField label={t('Title')} name="title" defaultValue={values.title} error={fieldError('title')} required />
      <ImageField
        name="cover"
        label={t('Cover')}
        currentUrl={novel?.coverUrl}
        error={fieldError('cover')}
        removeLabel={t('Remove the cover')}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="status"
          label={t('Status')}
          value={values.status}
          options={PROJECT_STATUSES.map((status) => [status, t(PROJECT_STATUS_LABELS[status])])}
        />
        <SelectField
          name="type"
          label={t('What kind of project is it?')}
          value={values.type}
          options={PROJECT_TYPES.map((type) => [type, t(PROJECT_TYPE_LABELS[type])])}
        />
      </div>
      <GenreInput defaultValue={values.genres} error={fieldError('genres')} />
      {novel ? null : (
        <SelectField
          name="event"
          label={t('Join an event')}
          value={values.event}
          options={[['', t('No event')], ...EVENT_IDS.map((id): [string, string] => [id, t(EVENT_LABELS[id])])]}
        />
      )}
      <TextArea name="summary" label={t('Summary')} value={values.summary} rows={4} error={fieldError('summary')} />
      <RichTextEditor name="excerpt" label={t('Excerpt')} defaultValue={values.excerpt} error={fieldError('excerpt')} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label={t('Pinterest board')}
          name="pinterestUrl"
          type="url"
          placeholder="https://"
          defaultValue={values.pinterestUrl}
          error={fieldError('pinterestUrl')}
        />
        <FormField
          label={t('Playlist')}
          name="playlistUrl"
          type="url"
          placeholder="https://"
          defaultValue={values.playlistUrl}
          error={fieldError('playlistUrl')}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={values.featured === 'on'} />{' '}
        {t('Feature this novel on my desk')}
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{novel ? t('Save changes') : t('Create novel')}</SubmitButton>
        <Link href={cancelHref} className="font-display text-sm text-ink-soft underline underline-offset-4">
          {t('Cancel')}
        </Link>
      </div>
    </form>
  );
}
