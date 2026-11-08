import { countWords, wordsOf } from './words';

describe('countWords', () => {
  it('counts words with accents, hyphens and apostrophes once', () => {
    expect(countWords('O guarda-chuva caiu na poça d’água — e então… nada.')).toBe(9);
    expect(countWords("Rock'n roll às 3 da manhã")).toBe(6);
  });

  it('ignores punctuation, dashes and empty text', () => {
    expect(countWords('  — … !! ')).toBe(0);
    expect(countWords('')).toBe(0);
    expect(wordsOf('Ela disse: sim.')).toEqual(['Ela', 'disse', 'sim']);
    expect(wordsOf('...')).toEqual([]);
  });
});
