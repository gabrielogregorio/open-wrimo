import { pickOne, type Random } from '../random';
import type { FantasyStyle, NameCollection } from './types';

export const NAME_GENDERS = ['female', 'male', 'any'] as const;

export type NameGender = (typeof NAME_GENDERS)[number];
export type NameSource = { kind: 'collection'; collection: NameCollection } | { kind: 'fantasy'; style: FantasyStyle };

const EPITHET_CHANCE = 0.5;

const pickGender = (gender: NameGender, random: Random): 'female' | 'male' =>
  gender === 'any' ? pickOne(['female', 'male'] as const, random) : gender;

const withSurname = (given: string, surnames: readonly string[], random: Random): string =>
  surnames.length > 0 ? `${given} ${pickOne(surnames, random)}` : given;

export const collectionName = (collection: NameCollection, gender: 'female' | 'male', random: Random): string => {
  const given = pickOne(collection[gender], random);
  const surnames = (gender === 'female' && collection.femaleSurnames) || collection.surnames;

  if (collection.format === 'surname-given') {
    return surnames.length > 0 ? `${pickOne(surnames, random)} ${given}` : given;
  }

  if (collection.format === 'patronymic' && collection.patronymic && collection.male.length > 0) {
    const father = pickOne(collection.male, random);
    const suffix = gender === 'female' ? collection.patronymic.daughter : collection.patronymic.son;

    return `${given} ${father}${suffix}`;
  }

  if (collection.format === 'given-only') {
    return surnames.length > 0 && random() < EPITHET_CHANCE ? `${given}, ${pickOne(surnames, random)}` : given;
  }

  return withSurname(given, surnames, random);
};

export const fantasyName = (style: FantasyStyle, gender: 'female' | 'male', random: Random): string => {
  const ends = gender === 'female' ? style.femaleEnds : style.maleEnds;

  return withSurname(`${pickOne(style.starts, random)}${pickOne(ends, random)}`, style.houses, random);
};

export const generateName = (source: NameSource, gender: NameGender, random: Random): string => {
  const picked = pickGender(gender, random);

  return source.kind === 'fantasy'
    ? fantasyName(source.style, picked, random)
    : collectionName(source.collection, picked, random);
};

// A batch of different names; it stops trying after a while if the lists run short.
export const generateNames = (source: NameSource, gender: NameGender, random: Random, count = 10): string[] => {
  const names = new Set<string>();

  for (let attempt = 0; attempt < count * 10 && names.size < count; attempt += 1) {
    names.add(generateName(source, gender, random));
  }

  return [...names];
};
