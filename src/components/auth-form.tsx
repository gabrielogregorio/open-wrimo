'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { FormAlert } from './form-alert';
import { FormField } from './form-field';
import { useI18n } from './i18n-provider';
import { PasswordField } from './password-field';
import { UsernameInput } from './username-input';
import { SubmitButton } from './submit-button';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  next?: string;
};

function TermsConsent({ checked, error }: { checked: boolean; error?: string }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="acceptTerms"
          defaultChecked={checked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'field-acceptTerms-error' : undefined}
          className="mt-0.5 h-5 w-5 shrink-0"
          required
        />
        <span>
          {t('I have read and accept the')}{' '}
          <Link href="/termos" target="_blank" className="text-accent underline underline-offset-4">
            {t('Terms of Use and Privacy Policy')}
          </Link>
          .
        </span>
      </label>
      {error ? (
        <p id="field-acceptTerms-error" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({ mode, action, next }: AuthFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const isSignUp = mode === 'sign-up';
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormAlert message={state.error ? t(state.error, state.errorValues) : undefined} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {isSignUp ? (
        <FormField
          label={t('Name')}
          name="name"
          autoComplete="name"
          defaultValue={state.values?.name}
          error={fieldError('name')}
          required
        />
      ) : null}
      {isSignUp ? (
        <UsernameInput
          label={t('Username')}
          hint={t('Your public address: /u/username')}
          defaultValue={state.values?.username}
          error={fieldError('username')}
        />
      ) : null}
      <FormField
        label={t('Email')}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={fieldError('email')}
        required
      />
      <PasswordField
        label={t('Password')}
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        hint={isSignUp ? t('At least 10 characters.') : undefined}
        error={fieldError('password')}
        keepValue={isSignUp}
      />
      {isSignUp ? (
        <TermsConsent checked={state.values?.acceptTerms === 'on'} error={fieldError('acceptTerms')} />
      ) : null}
      <SubmitButton pendingLabel={isSignUp ? t('Creating account…') : t('Signing in…')}>
        {isSignUp ? t('Create account') : t('Sign in')}
      </SubmitButton>
      <p className="text-center text-sm text-ink-soft">
        {isSignUp ? t('Already have a library card?') : t('New here?')}{' '}
        <Link href={isSignUp ? '/login' : '/register'} className="text-accent underline underline-offset-4">
          {isSignUp ? t('Sign in') : t('Create account')}
        </Link>
      </p>
    </form>
  );
}
