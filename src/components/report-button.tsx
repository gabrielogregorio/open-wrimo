'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useActionState, useId, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { reportAction } from '@/app/actions/moderation';
import { REPORT_REASONS, type ReportTarget } from '@/lib/db/collections';
import type { FormState } from '@/lib/form';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASON_LABELS } from '@/lib/moderation/labels';
import { FormAlert } from './form-alert';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

/** What the reader is reporting, shown at the top of the dialog so they can check it is the right one. */
export type ReportPreview = { title: string; imageUrl: string | null; description?: ReactNode };

type ReportButtonProps = {
  target: ReportTarget;
  username: string;
  /** The reported novel, when the target is a novel. */
  projectId?: string;
  preview: ReportPreview;
};

const quietButtonClasses =
  'inline-flex min-h-11 items-center justify-center rounded-sm px-3 text-sm text-ink-soft underline underline-offset-4 hover:text-danger';

function SendReportButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-sm border border-danger px-4 font-display text-sm font-semibold tracking-wide text-danger transition hover:bg-paper disabled:opacity-60">
      {pending ? t('Sending report…') : t('Send report')}
    </button>
  );
}

type ReportFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: (describedBy: { 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode;
};

function ReportField({ id, label, error, children }: ReportFieldProps) {
  const errorId = `${id}-error`;
  const described = error ? { 'aria-invalid': true as const, 'aria-describedby': errorId } : {};

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      {children(described)}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type ReportFormProps = Omit<ReportButtonProps, 'preview'> & {
  state: FormState;
  formAction: (formData: FormData) => void;
  onCancel: () => void;
};

function ReportForm({ target, username, projectId = '', state, formAction, onCancel }: ReportFormProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const id = useId();
  const detailsRequired = reason === 'other';
  const fieldError = (field: string): string | undefined => {
    const message = state.fieldErrors?.[field];

    return message ? t(message) : undefined;
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="username" value={username} />
      <input type="hidden" name="projectId" value={projectId} />
      <FormAlert message={state.error ? t(state.error, state.errorValues) : undefined} />

      <ReportField id={`${id}-reason`} label={t('Reason')} error={fieldError('reason')}>
        {(described) => (
          <select
            id={`${id}-reason`}
            name="reason"
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`${fieldClasses} min-h-11`}
            {...described}>
            <option value="" disabled>
              {t('Choose a reason')}
            </option>
            {REPORT_REASONS.map((item) => (
              <option key={item} value={item}>
                {t(REPORT_REASON_LABELS[item])}
              </option>
            ))}
          </select>
        )}
      </ReportField>

      <ReportField
        id={`${id}-details`}
        label={detailsRequired ? t('What is wrong?') : t('Details (optional)')}
        error={fieldError('details')}>
        {(described) => (
          <textarea
            id={`${id}-details`}
            name="details"
            rows={4}
            maxLength={REPORT_DETAILS_MAX_LENGTH}
            required={detailsRequired}
            className={fieldClasses}
            {...described}
          />
        )}
      </ReportField>

      <p className="text-xs text-ink-soft">
        {t('Reports are anonymous to the reported person. Content involving children is reported to the authorities.')}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <SendReportButton />
        <button type="button" onClick={onCancel} className={quietButtonClasses}>
          {t('Cancel report')}
        </button>
      </div>
    </form>
  );
}

function PreviewCard({ target, preview }: { target: ReportTarget; preview: ReportPreview }) {
  const { t } = useI18n();
  const imageClasses = target === 'novel' ? 'h-24 w-16 rounded-sm' : 'h-16 w-16 rounded-full';

  return (
    <section
      aria-label={t('What you are reporting')}
      className="flex items-start gap-4 rounded-sm border border-rule p-3">
      {preview.imageUrl ? (
        <img src={preview.imageUrl} alt="" className={`${imageClasses} shrink-0 border border-rule object-cover`} />
      ) : null}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-display font-semibold break-words">{preview.title}</p>
        {preview.description ? (
          <div className="line-clamp-4 text-sm break-words text-ink-soft">{preview.description}</div>
        ) : null}
      </div>
    </section>
  );
}

/** A quiet link-like button that opens an accessible dialog (focus kept inside, Escape closes) to report. */
export function ReportButton({ preview, ...props }: ReportButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(reportAction, {});
  const buttonLabel = props.target === 'novel' ? t('Report novel') : t('Report profile');

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className={quietButtonClasses}>
          {buttonLabel}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-sm border border-rule bg-paper p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-semibold">{buttonLabel}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t('Close')}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-ink-soft hover:text-ink">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-ink-soft">
            {t('Check that this is what you want to report.')}
          </Dialog.Description>
          <PreviewCard target={props.target} preview={preview} />
          {state.saved ? (
            <p role="status" className="text-sm">
              {t('Thank you. Your report was sent to the moderation team.')}
            </p>
          ) : (
            <ReportForm {...props} state={state} formAction={formAction} onCancel={() => setOpen(false)} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
