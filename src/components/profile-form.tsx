'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { PROFILE_SECTIONS } from '@/lib/db/collections';
import type { ProfileView } from '@/lib/writing/repository';
import { PRONOUNS } from '@/lib/writing/schema';
import { FormAlert } from './form-alert';
import { FormField, fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';
import { UsernameInput } from './username-input';
import { ImageField } from './image-field';
import { SubmitButton } from './submit-button';
import { PRONOUN_LABELS } from './writing-labels';

type ProfileFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  profile: ProfileView;
  name: string;
  username: string;
};

const SECTION_LABELS = { bio: 'About me', stats: 'Numbers', favorites: 'Favorites', badges: 'Badges' } as const;

function Area({
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
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field-${name}`} className="font-display text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={`field-${name}`}
        name={name}
        rows={rows}
        defaultValue={value}
        aria-invalid={error ? true : undefined}
        className={fieldClasses}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function ProfileForm({ action, profile, name, username }: ProfileFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? {
    ...profile,
    name,
    username,
    isPublic: profile.isPublic ? 'on' : '',
  };
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert message={state.error ? t(state.error) : undefined} />
      <FormField label={t('Name')} name="name" defaultValue={values.name} error={fieldError('name')} required />
      <UsernameInput
        label={t('Username')}
        hint={t('Your public address: /u/username')}
        defaultValue={values.username}
        error={fieldError('username')}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="field-pronouns" className="font-display text-sm font-semibold">
          {t('Pronouns')}
        </label>
        <select
          key={values.pronouns}
          id="field-pronouns"
          name="pronouns"
          defaultValue={values.pronouns}
          aria-describedby="field-pronouns-hint"
          aria-invalid={fieldError('pronouns') ? true : undefined}
          className={fieldClasses}>
          <option value="">{t('Rather not say')}</option>
          {PRONOUNS.map((pronoun) => (
            <option key={pronoun} value={pronoun}>
              {t(PRONOUN_LABELS[pronoun])}
            </option>
          ))}
        </select>
        <p id="field-pronouns-hint" className="text-xs text-ink-soft">
          {t('Moods and texts about you use the form you pick.')}
        </p>
        {fieldError('pronouns') ? <p className="text-sm text-danger">{fieldError('pronouns')}</p> : null}
      </div>
      <fieldset className="flex flex-col gap-3 rounded-sm border border-rule p-4">
        <legend className="px-1 font-display text-sm font-semibold">{t('Public profile')}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublic" defaultChecked={values.isPublic === 'on'} className="h-5 w-5" />
          {t('Anyone with the link can see my profile')}
        </label>
        <p className="text-xs text-ink-soft">{t('What the public profile shows:')}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {PROFILE_SECTIONS.map((section) => (
            <label key={section} className="flex items-center gap-2">
              <input type="checkbox" name="show" value={section} defaultChecked={profile.shown[section]} />
              {t(SECTION_LABELS[section])}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-soft">{t('Novels appear only when the novel itself is public.')}</p>
      </fieldset>
      <ImageField
        name="avatar"
        label={t('Profile picture')}
        currentUrl={profile.avatarUrl}
        error={fieldError('avatar')}
        removeLabel={t('Remove the picture')}
      />
      <Area name="bio" label={t('About me')} value={values.bio} rows={5} error={fieldError('bio')} />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label={t('Where I write')}
          name="location"
          defaultValue={values.location}
          error={fieldError('location')}
        />
        <FormField
          label={t('When I write')}
          name="writingTime"
          placeholder={t('Early in the morning')}
          defaultValue={values.writingTime}
          error={fieldError('writingTime')}
        />
      </div>
      <Area
        name="favoriteBooks"
        label={t('Favorite books')}
        value={values.favoriteBooks}
        rows={3}
        error={fieldError('favoriteBooks')}
      />
      <Area
        name="favoriteAuthors"
        label={t('Favorite authors')}
        value={values.favoriteAuthors}
        rows={3}
        error={fieldError('favoriteAuthors')}
      />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{t('Save changes')}</SubmitButton>
        <Link href="/write/profile" className="font-display text-sm text-ink-soft underline underline-offset-4">
          {t('Cancel')}
        </Link>
      </div>
    </form>
  );
}
