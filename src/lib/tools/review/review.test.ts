import { dialogueShare } from './dialogue';
import { bandOf, readability, syllablesOf } from './readability';
import { paragraphRepetitions } from './repetition';
import { countBy, isMeaningful, paragraphsOf, sentencesOf } from './text';
import { textStats } from './text-stats';

describe('text helpers', () => {
  it('splits paragraphs by line and drops empty ones', () => {
    expect(paragraphsOf('Um.\n\n  \nDois três.\n--')).toEqual(['Um.', 'Dois três.']);
  });

  it('splits sentences at end marks, closing quotes and line breaks', () => {
    expect(sentencesOf('Ele veio. Ela foi! Será? “Sim.” Depois… nada\nOutra linha')).toEqual([
      'Ele veio.',
      'Ela foi!',
      'Será?',
      '“Sim.”',
      'Depois…',
      'nada',
      'Outra linha',
    ]);
  });

  it('ignores stop words, short words and numbers', () => {
    expect(isMeaningful('casa')).toBe(true);
    expect(isMeaningful('Que')).toBe(false);
    expect(isMeaningful('mar', 4)).toBe(false);
    expect(isMeaningful('2026')).toBe(false);
  });

  it('counts words from the most used, ties in alphabetical order', () => {
    expect(countBy(['b', 'a', 'b', 'c', 'a', 'b'])).toEqual([
      { word: 'b', count: 3 },
      { word: 'a', count: 2 },
      { word: 'c', count: 1 },
    ]);
  });
});

describe('textStats', () => {
  it('counts words, sentences, paragraphs, repeated words and adverbs', () => {
    const stats = textStats(
      'Ele correu rapidamente para casa. Depois andou lentamente pela casa grande!\n\nA semente, a casa e Rapidamente.',
    );

    expect(stats).toMatchObject({ words: 17, sentences: 3, paragraphs: 2, readingMinutes: 1, adverbTotal: 3 });
    expect(stats.repeated).toEqual([
      { word: 'casa', count: 3 },
      { word: 'rapidamente', count: 2 },
    ]);
    expect(stats.adverbs).toEqual([
      { word: 'rapidamente', count: 2 },
      { word: 'lentamente', count: 1 },
    ]);
    expect(stats.longSentences).toEqual([]);
  });

  it('lists sentences longer than the limit', () => {
    const stats = textStats('Uma frase com seis palavras aqui. Curta.', 5);

    expect(stats.longSentences).toEqual([{ text: 'Uma frase com seis palavras aqui.', words: 6 }]);
  });

  it('reads an empty text as zero', () => {
    expect(textStats('')).toMatchObject({ words: 0, sentences: 0, readingMinutes: 0, repeated: [] });
    expect(textStats('palavra '.repeat(500)).readingMinutes).toBe(3);
  });
});

describe('readability', () => {
  it.each([
    ['casa', 2],
    ['poeta', 3],
    ['saída', 3],
    ['saúde', 3],
    ['quero', 2],
    ['guerra', 2],
    ['água', 2],
    ['aquário', 4],
    ['leão', 2],
    ['pão', 1],
    ['põe', 1],
    ['coração', 3],
    ['dia', 2],
    ['Brasil', 2],
    ['computador', 4],
    ['pneu', 1],
    ['aula', 2],
    ['2026', 1],
  ])('counts the syllables of "%s"', (word, syllables) => {
    expect(syllablesOf(word)).toBe(syllables);
  });

  it.each([
    [90, 'very easy'],
    [75, 'very easy'],
    [60, 'easy'],
    [30, 'hard'],
    [10, 'very hard'],
  ])('puts %i in the band "%s"', (score, band) => {
    expect(bandOf(score)).toBe(band);
  });

  it('scores a text with the Portuguese Flesch formula', () => {
    expect(readability('O gato bebe leite. A casa é azul.')).toEqual({
      score: 100,
      band: 'very easy',
      words: 8,
      sentences: 2,
      syllables: 13,
    });
    expect(
      readability(
        'A implementação extraordinariamente complexa das responsabilidades administrativas governamentais inviabilizou consideravelmente a organização',
      ),
    ).toMatchObject({ score: 0, band: 'very hard', sentences: 1 });
  });

  it('has no score without words', () => {
    expect(readability(' … ')).toBeNull();
  });
});

describe('paragraphRepetitions', () => {
  it('marks words repeated inside the same paragraph', () => {
    const [first, second] = paragraphRepetitions('Casa casa, casa e mar mar mar.\nCasa nova');

    expect(first.repeated).toEqual([{ word: 'casa', count: 3 }]);
    expect(first.tokens.slice(0, 2)).toEqual([
      { text: 'Casa', word: 'casa', repeated: true },
      { text: ' ', word: null, repeated: false },
    ]);
    expect(first.tokens.find((token) => token.text === 'mar')).toEqual({ text: 'mar', word: 'mar', repeated: false });
    expect(second.repeated).toEqual([]);
  });

  it('follows the threshold and the minimum length', () => {
    expect(paragraphRepetitions('mar mar', 2, 3)[0].repeated).toEqual([{ word: 'mar', count: 2 }]);
  });
});

describe('dialogueShare', () => {
  it('reads dash lines with the narrator cutting in', () => {
    expect(dialogueShare('— Vamos embora — disse ela. — Agora.\nEle saiu.')).toEqual({
      dialogueWords: 3,
      narrationWords: 4,
      dialoguePercent: 43,
    });
  });

  it('reads en dashes, hyphens and quotes', () => {
    expect(dialogueShare('– Oi.\n- Tudo bem?\nEle disse “até logo” e "tchau". "Sem fim')).toEqual({
      dialogueWords: 8,
      narrationWords: 3,
      dialoguePercent: 73,
    });
  });

  it('is zero for an empty text', () => {
    expect(dialogueShare('')).toEqual({ dialogueWords: 0, narrationWords: 0, dialoguePercent: 0 });
  });
});
