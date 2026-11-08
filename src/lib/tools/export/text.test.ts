import { blocksOf, escapeXml, slugify } from './text';

describe('escapeXml', () => {
  it('escapes markup and drops characters XML forbids', () => {
    expect(escapeXml(`<a href="x">Tom & 'Ana'</a>\u0001`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Ana&apos;&lt;/a&gt;',
    );
  });
});

describe('blocksOf', () => {
  it('reads lines as paragraphs and marks scene breaks', () => {
    expect(blocksOf('Primeira linha.\r\n\n  Segunda.  \n***\n#\n* * *\nFim.')).toEqual([
      { kind: 'paragraph', text: 'Primeira linha.' },
      { kind: 'paragraph', text: 'Segunda.' },
      { kind: 'break' },
      { kind: 'break' },
      { kind: 'break' },
      { kind: 'paragraph', text: 'Fim.' },
    ]);
  });
});

describe('slugify', () => {
  it('makes a safe file name with a fallback', () => {
    expect(slugify('Capítulo 1: A Ação!', 'x')).toBe('capitulo-1-a-acao');
    expect(slugify('???', 'draft')).toBe('draft');
  });
});
