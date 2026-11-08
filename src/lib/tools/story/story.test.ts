import { RARE_ODDS, RARE_TWISTS, TWISTS, rollFace, rollTwist } from './plot-dice';
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
  it('has many twists, all different, and rolls a different one', () => {
    expect(TWISTS.length).toBeGreaterThanOrEqual(150);
    expect(RARE_TWISTS.length).toBeGreaterThanOrEqual(30);
    expect(new Set([...TWISTS, ...RARE_TWISTS]).size).toBe(TWISTS.length + RARE_TWISTS.length);
    expect(rollTwist(() => 0)).toEqual({ twist: TWISTS[0], rare: false });
    expect(rollTwist(sequence(0, 0, 0.5), TWISTS[0]).twist).not.toBe(TWISTS[0]);
  });

  it('rolls a rare twist only at the top 1 in RARE_ODDS of the first draw', () => {
    expect(rollTwist(sequence(1 - 1 / RARE_ODDS, 0))).toEqual({ twist: RARE_TWISTS[0], rare: true });
    expect(rollTwist(sequence(0.94, 0))).toEqual({ twist: TWISTS[0], rare: false });
  });

  it('shows a face from 1 to 6', () => {
    expect(rollFace(() => 0)).toBe(1);
    expect(rollFace(() => 0.99)).toBe(6);
    expect(rollFace(() => 1)).toBe(6);
  });
});
