import { IDEA_CHARACTERS, IDEA_CONFLICTS, IDEA_PLACES, rerollPart, rollIdea } from './ideas';
import { NAME_ERAS, NAME_REGIONS, generateName, generateNames } from './names';
import { TWISTS, rollFace, rollTwist } from './plot-dice';
import { newEntryId, pickOne, pickOther, storyKey } from './random';

// Returns the given values in turn, repeating the last one.
const sequence =
  (...values: number[]) =>
  () =>
    values.length > 1 ? (values.shift() as number) : values[0];

describe('random helpers', () => {
  it('picks by position and never past the end', () => {
    expect(pickOne(['a', 'b', 'c'], () => 0.5)).toBe('b');
    expect(pickOne(['a', 'b', 'c'], () => 1)).toBe('c');
  });

  it('draws again when the pick repeats the current one, up to a limit', () => {
    expect(pickOther(['a', 'b'], 'a', sequence(0, 0, 0.9))).toBe('b');
    expect(pickOther(['a', 'b'], 'a', () => 0)).toBe('a');
  });

  it('makes unique ids and story keys', () => {
    expect(newEntryId(36)).not.toBe(newEntryId(36));
    expect(newEntryId()).toMatch(/^\w+-\w+$/);
    expect(storyKey('novel-1', 'characters')).toBe('story:novel-1:characters');
    expect(storyKey('', 'ideas')).toBe('story:loose:ideas');
  });
});

describe('ideas', () => {
  it('has at least 40 options in each list', () => {
    expect(IDEA_CHARACTERS.length).toBeGreaterThanOrEqual(40);
    expect(IDEA_PLACES.length).toBeGreaterThanOrEqual(40);
    expect(IDEA_CONFLICTS.length).toBeGreaterThanOrEqual(40);
  });

  it('rolls a whole idea and rerolls one part', () => {
    const idea = rollIdea(() => 0);

    expect(idea).toEqual({ character: IDEA_CHARACTERS[0], place: IDEA_PLACES[0], conflict: IDEA_CONFLICTS[0] });
    expect(rollIdea(sequence(0, 0.99), idea).character).not.toBe(IDEA_CHARACTERS[0]);
    expect(rerollPart(idea, 'place', () => 0.99)).toEqual({ ...idea, place: IDEA_PLACES.at(-1) });
  });
});

describe('plot dice', () => {
  it('has at least 60 twists and rolls a different one', () => {
    expect(TWISTS.length).toBeGreaterThanOrEqual(60);
    expect(rollTwist(() => 0)).toBe(TWISTS[0]);
    expect(rollTwist(sequence(0, 0.5), TWISTS[0])).not.toBe(TWISTS[0]);
  });

  it('shows a face from 1 to 6', () => {
    expect(rollFace(() => 0)).toBe(1);
    expect(rollFace(() => 0.99)).toBe(6);
    expect(rollFace(() => 1)).toBe(6);
  });
});

describe('names', () => {
  it.each(NAME_ERAS.flatMap((era) => NAME_REGIONS.map((region) => [era, region] as const)))(
    'makes a name for %s and %s',
    (era, region) => {
      expect(generateName({ era, region, gender: 'female' }, () => 0.3)).toContain(' ');
      expect(generateName({ era, region, gender: 'male' }, () => 0.7)).toContain(' ');
    },
  );

  it('picks a gender when any will do', () => {
    expect(generateName({ era: 'contemporary', region: 'brazil', gender: 'any' }, () => 0)).toBe('Helena Silva');
    expect(generateName({ era: 'contemporary', region: 'brazil', gender: 'any' }, sequence(0.9, 0))).toBe(
      'Miguel Silva',
    );
  });

  it('gives devotional surnames in colonial Brazil', () => {
    expect(generateName({ era: 'colonial', region: 'brazil', gender: 'female' }, sequence(0, 0.99))).toBe(
      'Maria das Neves',
    );
  });

  it('generates a batch of different names and gives up when the draw keeps repeating', () => {
    const names = generateNames({ era: 'midcentury', region: 'italian', gender: 'any' }, Math.random);

    expect(new Set(names).size).toBe(10);
    expect(generateNames({ era: 'fantasy', region: 'japanese', gender: 'male' }, () => 0, 3)).toEqual([
      'Aeldor da Torre Cinzenta',
    ]);
  });
});
