'use client';

import { useState, type ReactNode } from 'react';
import { SubmitButton } from './submit-button';

type ConfirmedSubmitProps = {
  /** The sentence the person ticks to confirm. */
  confirmLabel: ReactNode;
  /** Shown under the box when the server was sent the form without it. */
  error?: string;
  pendingLabel: ReactNode;
  children: ReactNode;
};

/**
 * A box to tick and a danger button that stays off until it is ticked. The box is still sent as
 * `confirm`, so the server checks it too.
 */
export function ConfirmedSubmit({ confirmLabel, error, pendingLabel, children }: ConfirmedSubmitProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="confirm"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'confirm-error' : undefined}
        />
        <span>{confirmLabel}</span>
      </label>
      {error ? (
        <p id="confirm-error" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <SubmitButton variant="danger" pendingLabel={pendingLabel} disabled={!confirmed}>
        {children}
      </SubmitButton>
    </>
  );
}
