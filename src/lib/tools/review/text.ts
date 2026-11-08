import { wordsOf } from '../words';

// Small words that carry grammar, not meaning. They are left out of the repetition counts.
export const STOP_WORDS = new Set(
  (
    'a à às ao aos aquela aquelas aquele aqueles aquilo as até com como da das de dela delas dele deles depois do dos ' +
    'e é ela elas ele eles em entre era eram essa essas esse esses esta está estava estavam estas este estes eu foi ' +
    'foram há isso isto já lhe lhes mais mas me mesmo meu meus minha minhas muito na nas não nem no nos nós num numa ' +
    'o os ou para pela pelas pelo pelos por porque quando que quem se sem ser seu seus sua suas só também te tem ' +
    'tinha tinham tu tua tuas teu teus um uma umas uns vai você vocês ia iam ter estar sido sobre então ainda assim ' +
    'onde qual quais cada tudo todo toda todos todas nada outro outra outros outras lá aqui aí ali disse'
  ).split(' '),
);

export const normalizeWord = (word: string): string => word.toLocaleLowerCase('pt-BR');

export const isMeaningful = (word: string, minLength = 3): boolean =>
  word.length >= minLength && !STOP_WORDS.has(normalizeWord(word)) && !/^\d+$/.test(word);

// Each non-empty line is a paragraph: pasted chapters often use one line per paragraph.
export const paragraphsOf = (text: string): string[] =>
  text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => wordsOf(paragraph).length > 0);

// A sentence ends at . ! ? or … (and runs of them); a paragraph break also ends one.
export const sentencesOf = (text: string): string[] =>
  paragraphsOf(text).flatMap((paragraph) =>
    paragraph
      .split(/(?<=[.!?…]+["”»)]?)\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => wordsOf(sentence).length > 0),
  );

export type WordCount = { word: string; count: number };

export const countBy = (words: string[]): WordCount[] => {
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((first, second) => second.count - first.count || first.word.localeCompare(second.word, 'pt-BR'));
};
