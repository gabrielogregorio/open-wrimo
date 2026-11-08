// Randomness is passed in so tests can pick exactly what comes out.
export type Random = () => number;

export const pickOne = <T>(items: readonly T[], random: Random): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];

// Picks again (a few times) when the draw repeats the current item, so a reroll changes something.
export const pickOther = <T>(items: readonly T[], current: T | undefined, random: Random): T => {
  let picked = pickOne(items, random);

  for (let attempt = 0; attempt < 5 && picked === current; attempt += 1) {
    picked = pickOne(items, random);
  }

  return picked;
};

let sequence = 0;

// An id that is unique on this device without crypto.randomUUID, which needs a secure context.
export const newEntryId = (now: number = Date.now()): string => {
  sequence += 1;

  return `${now.toString(36)}-${sequence.toString(36)}`;
};

export const storyKey = (novelId: string, kind: string): string => `story:${novelId || 'loose'}:${kind}`;
