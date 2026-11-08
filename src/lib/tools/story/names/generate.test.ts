import { collectionName, fantasyName, generateName, generateNames } from './generate';
import type { FantasyStyle, NameCollection } from './types';

const base: NameCollection = {
  id: 'test',
  group: 'medieval',
  label: 'Test',
  format: 'given-surname',
  female: ['Leonor', 'Inês'],
  male: ['Afonso', 'Sigurd'],
  surnames: ['de Coimbra'],
};
const first = () => 0;
const last = () => 0.99;

const style: FantasyStyle = {
  id: 'elven',
  label: 'Elven',
  starts: ['Ael'],
  femaleEnds: ['wen'],
  maleEnds: ['dor'],
  houses: ['Folha-de-Prata'],
};

describe('collection names', () => {
  it('puts the given name first, or the surname first where that is the custom', () => {
    expect(collectionName(base, 'female', first)).toBe('Leonor de Coimbra');
    expect(collectionName({ ...base, format: 'surname-given', surnames: ['Tanaka'] }, 'female', first)).toBe(
      'Tanaka Leonor',
    );
    expect(collectionName({ ...base, format: 'surname-given', surnames: [] }, 'male', first)).toBe('Afonso');
    expect(collectionName({ ...base, surnames: [] }, 'male', last)).toBe('Sigurd');
  });

  it('uses the feminine form of the family name for women where there is one', () => {
    const russian: NameCollection = { ...base, surnames: ['Ivanov'], femaleSurnames: ['Ivanova'] };

    expect(collectionName(russian, 'female', first)).toBe('Leonor Ivanova');
    expect(collectionName(russian, 'male', first)).toBe('Afonso Ivanov');
  });

  it('builds patronymics from a father taken from the male names', () => {
    const norse: NameCollection = { ...base, format: 'patronymic', patronymic: { son: 'sson', daughter: 'sdóttir' } };

    expect(collectionName(norse, 'male', last)).toBe('Sigurd Sigurdsson');
    expect(collectionName(norse, 'female', first)).toBe('Leonor Afonsosdóttir');
    expect(collectionName({ ...norse, patronymic: undefined }, 'male', first)).toBe('Afonso de Coimbra');
  });

  it('gives a single name an epithet about half of the time', () => {
    const ancient: NameCollection = { ...base, format: 'given-only', surnames: ['a Jovem'] };

    expect(collectionName(ancient, 'female', first)).toBe('Leonor, a Jovem');
    expect(collectionName(ancient, 'female', () => 0.6)).toBe('Inês');
    expect(collectionName({ ...ancient, surnames: [] }, 'female', first)).toBe('Leonor');
  });
});

describe('generated names', () => {
  it('builds fantasy names from syllables and a house', () => {
    expect(fantasyName(style, 'female', first)).toBe('Aelwen Folha-de-Prata');
    expect(fantasyName({ ...style, houses: [] }, 'male', first)).toBe('Aeldor');
  });

  it('picks the gender, or either one for any', () => {
    expect(generateName({ kind: 'fantasy', style }, 'male', first)).toBe('Aeldor Folha-de-Prata');
    expect(generateName({ kind: 'collection', collection: base }, 'any', last)).toBe('Sigurd de Coimbra');
  });

  it('returns a batch of different names and gives up when the lists run short', () => {
    expect(new Set(generateNames({ kind: 'collection', collection: base }, 'any', Math.random, 4)).size).toBe(4);
    expect(generateNames({ kind: 'fantasy', style }, 'female', Math.random)).toEqual(['Aelwen Folha-de-Prata']);
  });
});
