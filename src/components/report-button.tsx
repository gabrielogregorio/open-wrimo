'use client';

import { useActionState, useId, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { reportAction } from '@/app/actions/moderation';
import { REPORT_REASONS, type ReportTarget } from '@/lib/db/collections';
import type { FormState } from '@/lib/form';
import { REPORT_DETAILS_MAX_LENGTH, REPORT_REASON_LABELS } from '@/lib/moderation/labels';
import { FormAlert } from './form-alert';
import { fieldClasses } from './form-field';
import { useI18n } from './i18n-provider';

type ReportButtonProps = {
  target: ReportTarget;
  username: string;
  /** The reported novel, when the target is a novel. */
  projectId?: string;
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

type ReportFormProps = ReportButtonProps & {
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

export function ReportButton(props: ReportButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(reportAction, {});
  const panelId = `${useId()}-panel`;
  const buttonLabel = props.target === 'novel' ? t('Report novel') : t('Report profile');

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={quietButtonClasses}>
        {buttonLabel}
      </button>

      {open ? (
        <section
          id={panelId}
          aria-label={buttonLabel}
          className="sheet flex w-full max-w-xl flex-col gap-4 rounded-sm border border-rule p-4 sm:p-6">
          {state.saved ? (
            <p role="status" className="text-sm">
              {t('Thank you. Your report was sent to the moderation team.')}
            </p>
          ) : (
            <ReportForm {...props} state={state} formAction={formAction} onCancel={() => setOpen(false)} />
          )}
        </section>
      ) : null}
    </div>
  );
}
