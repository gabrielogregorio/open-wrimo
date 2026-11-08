import { wordsOf } from '../words';
import { sentencesOf } from './text';

// Syllables are counted from groups of vowels. Inside a group, two strong vowels (a, e, o) or an
// accented í/ú start a new syllable (po-e-ta, sa-í-da); a weak vowel before a strong one too (di-a),
// except the u of "qu"/"gu" (que-ro) and the nasal diphthongs (ão, ãe, õe).
const VOWEL = /[aeiouáéíóúâêôãõàüy]/;
const STRONG = /[aeoáéóâêôãõà]/;
const WEAK = /[iuüy]/;
const ACCENTED_WEAK = /[íú]/;
const NASAL_DIPHTHONGS = new Set(['ão', 'ãe', 'õe', 'ãi', 'ũi']);

const splitsBetween = (first: string, second: string, afterQorG: boolean): boolean => {
  if (NASAL_DIPHTHONGS.has(first + second)) {
    return false;
  }

  if (ACCENTED_WEAK.test(second) || (STRONG.test(first) && STRONG.test(second))) {
    return true;
  }

  return WEAK.test(first) && STRONG.test(second) && !afterQorG;
};

export const syllablesOf = (word: string): number => {
  const letters = word.toLocaleLowerCase('pt-BR');
  let count = 0;
  let previous = '';
  let previousIsVowel = false;
  let groupStart = 0;

  for (let index = 0; index < letters.length; index += 1) {
    const letter = letters[index];
    const isVowel = VOWEL.test(letter);

    if (isVowel && !previousIsVowel) {
      count += 1;
      groupStart = index;
    } else if (isVowel) {
      const afterQorG = index - 1 === groupStart && /[qg]/.test(letters[groupStart - 1] ?? '') && /[uü]/.test(previous);
      count += splitsBetween(previous, letter, afterQorG) ? 1 : 0;
    }

    previous = letter;
    previousIsVowel = isVowel;
  }

  return Math.max(1, count);
};

export const READABILITY_BANDS = ['very easy', 'easy', 'hard', 'very hard'] as const;

export type ReadabilityBand = (typeof READABILITY_BANDS)[number];

export type Readability = {
  score: number;
  band: ReadabilityBand;
  words: number;
  sentences: number;
  syllables: number;
};

// Martins et al. (1996) bands: 75 to 100 very easy, 50 to 75 easy, 25 to 50 hard, below 25 very hard.
export const bandOf = (score: number): ReadabilityBand => {
  if (score >= 75) {
    return 'very easy';
  }

  if (score >= 50) {
    return 'easy';
  }

  return score >= 25 ? 'hard' : 'very hard';
};

// Flesch reading ease adapted to Portuguese: 248.835 − 1.015 × words/sentence − 84.6 × syllables/word.
export const readability = (text: string): Readability | null => {
  const words = wordsOf(text);

  if (words.length === 0) {
    return null;
  }

  const sentences = Math.max(1, sentencesOf(text).length);
  const syllables = words.reduce((total, word) => total + syllablesOf(word), 0);
  const raw = 248.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return { score, band: bandOf(score), words: words.length, sentences, syllables };
};
