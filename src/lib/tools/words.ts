// Counts words the way a writer would: anything with a letter or digit between spaces, so "guarda-chuva"
// and "d'água" count once and stray dashes or ellipses do not count.
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export const countWords = (text: string): number => text.match(WORD)?.length ?? 0;

export const wordsOf = (text: string): string[] => text.match(WORD) ?? [];
