'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/form';
import type { PostView } from '@/lib/writing/repository';
import { FormAlert } from './form-alert';
import { FormField } from './form-field';
import { useI18n } from './i18n-provider';
import { ImageField } from './image-field';
import { RichTextEditor } from './rich-text-editor';
import { SubmitButton } from './submit-button';

type PostFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  post?: PostView;
};

export function PostForm({ action, cancelHref, post }: PostFormProps) {
  const { t } = useI18n();
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? { title: post?.title ?? '', body: post?.body ?? '' };
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <FormAlert message={state.error ? t(state.error) : undefined} />
      <FormField label={t('Title')} name="title" defaultValue={values.title} error={fieldError('title')} required />
      <RichTextEditor name="body" label={t('Post')} defaultValue={values.body} error={fieldError('body')} />
      <ImageField
        name="image"
        label={t('Picture')}
        currentUrl={post?.imageUrl}
        error={fieldError('image')}
        removeLabel={t('Remove the picture')}
      />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>{post ? t('Save changes') : t('Publish post')}</SubmitButton>
        <Link href={cancelHref} className="font-display text-sm text-ink-soft underline underline-offset-4">
          {t('Cancel')}
        </Link>
      </div>
    </form>
  );
}
