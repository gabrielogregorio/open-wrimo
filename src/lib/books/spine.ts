export const SPINE_TONES = 8;
const MIN_SPINE_REM = 1.75;
const MAX_SPINE_REM = 3.5;
const PAGES_PER_EXTRA_REM = 250;
const HEIGHT_STEPS = [11, 12, 12.5, 13, 13.5] as const;
const HASH_MULTIPLIER = 31;

export const titleHash = (title: string): number => {
  let hash = 0;

  for (const character of title) {
    hash = (hash * HASH_MULTIPLIER + character.codePointAt(0)!) >>> 0;
  }

  return hash;
};

export const spineTone = (title: string): number => titleHash(title) % SPINE_TONES;

export const spineWidthRem = (totalPages: number): number =>
  Math.min(MIN_SPINE_REM + totalPages / PAGES_PER_EXTRA_REM, MAX_SPINE_REM);

export const spineHeightRem = (title: string): number => HEIGHT_STEPS[titleHash(title) % HEIGHT_STEPS.length];
