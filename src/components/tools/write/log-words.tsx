'use client';

import Link from 'next/link';
import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from '@/lib/form';
import type { ToolData } from '@/lib/tools/data';
import { fieldClasses } from '../../form-field';
import { useI18n } from '../../i18n-provider';
import { primaryButton } from './styles';

type LogWordsProps = {
  data: ToolData;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** How many words would be logged to this goal now. */
  countFor: (goalId: string) => number;
  onLogged: (goalId: string, count: number) => void | Promise<void>;
  buttonLabel: (count: number) => string;
};

function LogButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  const { t } = useI18n();

  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? t('Saving…') : children}
    </button>
  );
}

// Sends the words written in a tool to one of the writer's open goals.
export function LogWords({ data, action, countFor, onLogged, buttonLabel }: LogWordsProps) {
  const { t } = useI18n();
  const choices = data.novels.flatMap((novel) =>
    novel.goals.map((goal) => ({ id: goal.id, label: `${novel.title} - ${goal.name}` })),
  );
  const [goalId, setGoalId] = useState(choices[0]?.id ?? '');
  const [state, formAction] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await action(previous, formData);

    if (result.saved) {
      await onLogged(String(formData.get('goal')), Number(formData.get('count')));
    }

    return result;
  }, {});

  if (choices.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        {t('To log these words, create a novel with a goal first.')}{' '}
        <Link href="/write/novels/new" className="text-accent underline underline-offset-4">
          {t('Create a novel')}
        </Link>
      </p>
    );
  }

  const count = countFor(goalId);
  const errorText = state.error ?? Object.values(state.fieldErrors ?? {})[0];

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="goal" value={goalId} />
      <input type="hidden" name="mode" value="add" />
      <input type="hidden" name="count" value={count} />
      <input type="hidden" name="date" value={data.today} />
      <input type="hidden" name="mood" value="" />
      <input type="hidden" name="place" value="" />
      <div className="flex flex-col gap-1">
        <label htmlFor="log-goal" className="font-display text-sm font-semibold">
          {t('Goal')}
        </label>
        <select
          id="log-goal"
          value={goalId}
          onChange={(event) => setGoalId(event.target.value)}
          className={`${fieldClasses} min-h-11`}>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </div>
      {count > 0 ? (
        <LogButton>{buttonLabel(count)}</LogButton>
      ) : (
        <p className="text-sm text-ink-soft">{t('No new words to log yet.')}</p>
      )}
      <p role="status" className="min-h-5 text-sm">
        {errorText ? <span className="text-danger">{t(errorText)}</span> : null}
        {state.saved && !errorText ? <span className="text-accent">{t('Words logged to your goal.')}</span> : null}
      </p>
    </form>
  );
}
