import { NAME_COLLECTIONS, NAME_GROUPS, NAME_LABELS_PT, FANTASY_STYLES, nameOptions, nameSource } from './index';

const lists = NAME_COLLECTIONS.flatMap((collection) => [
  [`${collection.id} female`, collection.female],
  [`${collection.id} male`, collection.male],
  [`${collection.id} surnames`, collection.surnames],
  [`${collection.id} female surnames`, collection.femaleSurnames ?? []],
]) as [string, readonly string[]][];

describe('name collections', () => {
  it('has unique ids, a Portuguese label and every group filled', () => {
    const ids = [...NAME_COLLECTIONS, ...FANTASY_STYLES].map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    [...NAME_COLLECTIONS, ...FANTASY_STYLES].forEach((item) => expect(NAME_LABELS_PT[item.label]).toBeTruthy());
    NAME_GROUPS.forEach((group) => expect(nameOptions(group).length).toBeGreaterThan(0));
  });

  // Curated historical lists hold only attested names, so they are shorter. The precolonial
  // Philippines keeps the few women on record (one inscription, one genealogy, the epics).
  const CURATED_MINIMUMS: Record<string, { female: number; male: number }> = {
    tupi: { female: 25, male: 25 },
    'asia-philippines-precolonial': { female: 19, male: 25 },
    'asia-indonesia-majapahit': { female: 25, male: 80 },
    'asia-thailand-ayutthaya': { female: 25, male: 25 },
  };

  it('has at least 80 names per gender, or the curated minimum for attested historical lists', () => {
    Object.keys(CURATED_MINIMUMS).forEach((id) => expect(NAME_COLLECTIONS.map((c) => c.id)).toContain(id));
    NAME_COLLECTIONS.forEach((collection) => {
      const minimum = CURATED_MINIMUMS[collection.id] ?? { female: 80, male: 80 };

      expect(collection.female.length, collection.id).toBeGreaterThanOrEqual(minimum.female);
      expect(collection.male.length, collection.id).toBeGreaterThanOrEqual(minimum.male);
    });
  });

  it.each(lists)('keeps %s clean: no repeats, blanks, stray spaces or em dashes', (_label, names) => {
    expect(new Set(names).size).toBe(names.length);
    names.forEach((name) => {
      expect(name.trim()).toBe(name);
      expect(name).not.toBe('');
      expect(name).not.toContain('—');
    });
  });

  it('finds a collection, a fantasy style, or falls back to contemporary Brazil', () => {
    expect(nameSource('old-norse')).toMatchObject({ kind: 'collection', collection: { id: 'old-norse' } });
    expect(nameSource(FANTASY_STYLES[0].id)).toMatchObject({ kind: 'fantasy' });
    expect(nameSource('gone')).toMatchObject({ collection: { id: 'brazil-contemporary' } });
    expect(nameOptions('brazil')[0].size).toBeGreaterThan(100);
  });
});
