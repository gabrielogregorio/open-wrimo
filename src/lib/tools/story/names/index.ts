import { ANCIENT_COLLECTIONS, ANCIENT_LABELS_PT } from './ancient';
import { ASIA_COLLECTIONS, ASIA_LABELS_PT } from './asia';
import { BRAZIL_COLLECTIONS, BRAZIL_LABELS_PT, EARLY_MODERN_COLLECTIONS, FANTASY_STYLES } from './brazil';
import type { NameSource } from './generate';
import { MEDIEVAL_COLLECTIONS, MEDIEVAL_LABELS_PT } from './medieval';
import type { NameCollection, NameGroup } from './types';
import { WORLD_COLLECTIONS, WORLD_LABELS_PT } from './world';

export { generateNames, NAME_GENDERS, type NameGender, type NameSource } from './generate';
export { FANTASY_STYLES } from './brazil';
export { NAME_GROUPS, type NameGroup } from './types';

export const NAME_COLLECTIONS: readonly NameCollection[] = [
  ...ANCIENT_COLLECTIONS,
  ...MEDIEVAL_COLLECTIONS,
  ...EARLY_MODERN_COLLECTIONS,
  ...BRAZIL_COLLECTIONS,
  ...ASIA_COLLECTIONS,
  ...WORLD_COLLECTIONS,
];

/** Portuguese for every collection and fantasy style label, spread into the interface dictionary. */
export const NAME_LABELS_PT: Record<string, string> = {
  ...ANCIENT_LABELS_PT,
  ...MEDIEVAL_LABELS_PT,
  ...BRAZIL_LABELS_PT,
  ...ASIA_LABELS_PT,
  ...WORLD_LABELS_PT,
};

export const DEFAULT_NAME_SOURCE = 'brazil-contemporary';

export type NameOption = { id: string; label: string; size: number };

const sizeOf = (collection: NameCollection): number => collection.female.length + collection.male.length;

/** The choices of the picker, by group; fantasy styles form the last group. */
export const nameOptions = (group: NameGroup): NameOption[] =>
  group === 'fantasy'
    ? FANTASY_STYLES.map((style) => ({ id: style.id, label: style.label, size: style.starts.length }))
    : NAME_COLLECTIONS.filter((collection) => collection.group === group).map((collection) => ({
        id: collection.id,
        label: collection.label,
        size: sizeOf(collection),
      }));

export const nameSource = (id: string): NameSource => {
  const style = FANTASY_STYLES.find((item) => item.id === id);

  if (style) {
    return { kind: 'fantasy', style };
  }

  const collection =
    NAME_COLLECTIONS.find((item) => item.id === id) ??
    (NAME_COLLECTIONS.find((item) => item.id === DEFAULT_NAME_SOURCE) as NameCollection);

  return { kind: 'collection', collection };
};
