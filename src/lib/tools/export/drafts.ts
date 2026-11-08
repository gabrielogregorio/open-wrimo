// Drafts written by the writing tools, read back by the export tools.
export type Draft = {
  id: string;
  novelId: string | null;
  title: string;
  text: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const DRAFT_PREFIX = 'draft:';

export const isDraft = (value: unknown): value is Draft => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const draft = value as Record<string, unknown>;

  return (
    typeof draft.id === 'string' &&
    typeof draft.text === 'string' &&
    typeof draft.title === 'string' &&
    (draft.novelId === null || typeof draft.novelId === 'string')
  );
};

// The live drafts in reading order; draft entries that look broken are left out.
export const liveDrafts = (entries: [string, unknown][]): Draft[] =>
  entries
    .filter(([key]) => key.startsWith(DRAFT_PREFIX))
    .map(([, value]) => value)
    .filter(isDraft)
    .filter((draft) => !draft.deletedAt)
    .sort((first, second) => first.order - second.order || first.createdAt.localeCompare(second.createdAt));

export const draftsOf = (drafts: Draft[], novelId: string | null): Draft[] =>
  drafts.filter((draft) => draft.novelId === novelId);
