import { countBy, isMeaningful, normalizeWord, paragraphsOf, type WordCount } from './text';

const TOKEN = /([\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*)/u;

export type Token = { text: string; word: string | null; repeated: boolean };

export type RepetitionParagraph = { tokens: Token[]; repeated: WordCount[] };

// Splits each paragraph into words and the spaces and punctuation between them, marking the meaningful
// words used at least `threshold` times inside that same paragraph.
export const paragraphRepetitions = (text: string, threshold = 3, minLength = 4): RepetitionParagraph[] =>
  paragraphsOf(text).map((paragraph) => {
    const pieces = paragraph.split(TOKEN).filter((piece) => piece !== '');
    const words = pieces.filter((piece) => TOKEN.test(piece)).map(normalizeWord);
    const repeated = countBy(words.filter((word) => isMeaningful(word, minLength))).filter(
      (entry) => entry.count >= threshold,
    );
    const repeatedWords = new Set(repeated.map((entry) => entry.word));
    const tokens = pieces.map((piece): Token => {
      const word = TOKEN.test(piece) ? normalizeWord(piece) : null;

      return { text: piece, word, repeated: word !== null && repeatedWords.has(word) };
    });

    return { tokens, repeated };
  });
