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
