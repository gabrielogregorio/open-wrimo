'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import { FormAlert } from './form-alert';
import { FormField } from './form-field';
import { useI18n } from './i18n-provider';
import { UsernameInput } from './username-input';
import { SubmitButton } from './submit-button';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  next?: string;
};

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
      <FormField
        label={t('Password')}
        name="password"
        type="password"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        hint={isSignUp ? t('At least 10 characters.') : undefined}
        error={fieldError('password')}
        required
      />
      <SubmitButton>{isSignUp ? t('Create account') : t('Sign in')}</SubmitButton>
      <p className="text-center text-sm text-ink-soft">
        {isSignUp ? t('Already have a library card?') : t('New here?')}{' '}
        <Link href={isSignUp ? '/login' : '/register'} className="text-accent underline underline-offset-4">
          {isSignUp ? t('Sign in') : t('Create account')}
        </Link>
      </p>
    </form>
  );
}
