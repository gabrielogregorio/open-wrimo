// Shared classes of the write tools. Every control is at least 44px tall for a thumb.
export const quietButton =
  'inline-flex min-h-11 items-center justify-center rounded-sm border border-rule px-4 font-display text-sm disabled:opacity-50';

export const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-sm bg-accent px-4 font-display text-sm font-semibold text-accent-ink disabled:opacity-60';

export const toggleLabel = 'inline-flex min-h-11 cursor-pointer items-center gap-2 font-display text-sm';

export const writingArea =
  'w-full resize-none rounded-sm border border-rule bg-paper p-4 text-lg leading-relaxed text-ink placeholder:text-ink-soft focus-visible:border-accent';
