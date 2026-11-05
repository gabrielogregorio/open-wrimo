import { SPINE_TONES, spineHeightRem, spineTone, spineWidthRem, titleHash } from './spine';

describe('spine look', () => {
  it('hashes a title the same way every time', () => {
    expect(titleHash('Dom Casmurro')).toBe(titleHash('Dom Casmurro'));
    expect(titleHash('Dom Casmurro')).not.toBe(titleHash('Memórias Póstumas'));
  });

  it('handles characters outside the basic plane', () => {
    expect(titleHash('📚')).toBe(128218);
  });

  it('picks a tone inside the palette', () => {
    expect(spineTone('Grande Sertão: Veredas')).toBe(titleHash('Grande Sertão: Veredas') % SPINE_TONES);
  });

  it.each([
    [1, 1.754],
    [250, 2.75],
    [5000, 3.5],
  ])('a book with %i pages gets a spine %f rem wide', (totalPages, width) => {
    expect(spineWidthRem(totalPages)).toBeCloseTo(width, 3);
  });

  it('gives each title one of the shelf heights', () => {
    expect([11, 12, 12.5, 13, 13.5]).toContain(spineHeightRem('Vidas Secas'));
  });
});
