'use client';

import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { PERSONAL_BADGES } from '@/lib/writing/badges';
import { BadgeIcon } from './badge-hex';
import { useI18n } from './i18n-provider';
import { SubmitButton } from './submit-button';

type PersonalBadgesFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  awarded: string[];
};

export function PersonalBadgesForm({ action, awarded }: PersonalBadgesFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col">
        <legend className="mb-3 font-display text-2xl">{t('Personal achievement badges')}</legend>
        {PERSONAL_BADGES.map((badge) => (
          <label
            key={badge.id}
            className="flex items-center gap-4 border-b border-rule px-2 py-3 text-sm odd:bg-paper last:border-0">
            <BadgeIcon badge={badge} kind="personal" className="h-14 w-14 shrink-0" />
            <span className="flex-1">
              <span className="font-display font-semibold">{t(badge.label)}</span>
              <span className="block text-ink-soft">{t(badge.description)}</span>
            </span>
            <input
              type="checkbox"
              name="badge"
              value={badge.id}
              defaultChecked={awarded.includes(badge.id)}
              className="h-5 w-5"
            />
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-4">
        <SubmitButton variant="quiet">{t('Save badges')}</SubmitButton>
        <p role="status" className="text-sm text-ink-soft">
          {state.saved ? t('Badges saved.') : ''}
        </p>
      </div>
    </form>
  );
}
