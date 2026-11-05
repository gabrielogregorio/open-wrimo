import { readingPercent, statusForProgress } from './progress';

describe('readingPercent', () => {
  it.each([
    [0, 300, 0],
    [149, 300, 49],
    [150, 300, 50],
    [300, 300, 100],
    [10, 0, 0],
  ])('page %i of %i is %i%%', (currentPage, totalPages, percent) => {
    expect(readingPercent(currentPage, totalPages)).toBe(percent);
  });

  it('never passes 100', () => {
    expect(readingPercent(400, 300)).toBe(100);
  });
});

describe('statusForProgress', () => {
  it.each([
    [300, 300, 'reading', 'finished'],
    [299, 300, 'finished', 'reading'],
    [1, 300, 'want', 'reading'],
    [0, 300, 'want', 'want'],
    [0, 300, 'finished', 'finished'],
    [12, 300, 'reading', 'reading'],
  ] as const)('page %i of %i turns "%s" into "%s"', (currentPage, totalPages, status, expected) => {
    expect(statusForProgress(currentPage, totalPages, status)).toBe(expected);
  });
});
