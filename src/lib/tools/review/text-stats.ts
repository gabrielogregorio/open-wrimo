import { wordsOf } from '../words';
import { countBy, isMeaningful, normalizeWord, paragraphsOf, sentencesOf, type WordCount } from './text';

export const READING_WORDS_PER_MINUTE = 200;

export type LongSentence = { text: string; words: number };

export type TextStats = {
  words: number;
  sentences: number;
  paragraphs: number;
  readingMinutes: number;
  repeated: WordCount[];
  longSentences: LongSentence[];
  adverbs: WordCount[];
  adverbTotal: number;
};

// Words like "mente" or "semente" end in -mente but are not adverbs, so very short ones are skipped.
const ADVERB = /^\p{L}{3,}mente$/u;
const NOT_ADVERBS = new Set(['semente', 'sementes', 'demente', 'clemente', 'veemente', 'sedimente']);

export const textStats = (text: string, longSentenceWords = 35, topWords = 10): TextStats => {
  const words = wordsOf(text);
  const sentences = sentencesOf(text);
  const normalized = words.map(normalizeWord);
  const adverbs = countBy(normalized.filter((word) => ADVERB.test(word) && !NOT_ADVERBS.has(word)));

  return {
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphsOf(text).length,
    readingMinutes: words.length === 0 ? 0 : Math.max(1, Math.round(words.length / READING_WORDS_PER_MINUTE)),
    repeated: countBy(normalized.filter((word) => isMeaningful(word, 4)))
      .filter((entry) => entry.count > 1)
      .slice(0, topWords),
    longSentences: sentences
      .map((sentence) => ({ text: sentence, words: wordsOf(sentence).length }))
      .filter((sentence) => sentence.words > longSentenceWords),
    adverbs,
    adverbTotal: adverbs.reduce((total, entry) => total + entry.count, 0),
  };
};
