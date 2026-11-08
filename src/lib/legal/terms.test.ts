import { TERMS_CHANGES, TERMS_VERSION, needsTermsAcceptance } from './terms';

describe('terms version', () => {
  it('asks for acceptance until the current version is accepted', () => {
    expect(needsTermsAcceptance(undefined)).toBe(true);
    expect(needsTermsAcceptance(null)).toBe(true);
    expect(needsTermsAcceptance('2026-01-01T00:00:00-03:00')).toBe(true);
    expect(needsTermsAcceptance(TERMS_VERSION)).toBe(false);
  });

  it('dates the version in Brasília time and says what changed', () => {
    expect(TERMS_VERSION).toMatch(/-03:00$/);
    expect(Number.isNaN(Date.parse(TERMS_VERSION))).toBe(false);
    expect(TERMS_CHANGES.length).toBeGreaterThan(0);
  });
});
