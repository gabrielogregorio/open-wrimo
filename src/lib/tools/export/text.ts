// Turns the plain text of a draft into paragraphs, and makes any text safe inside XML.
export type Block = { kind: 'paragraph'; text: string } | { kind: 'break' };

// Formatted text kept by the converter. Drafts only fill title and text; content, when present, is
// what the ePub renders, while text stays the plain version used for word counts.
export type Run = { text: string; bold?: boolean; italic?: boolean };

export type RichBlock =
  | { kind: 'paragraph'; runs: Run[] }
  | { kind: 'break' }
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'table'; rows: Run[][][] };

export type Chapter = { title: string; text: string; content?: RichBlock[] };

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;
const SCENE_BREAK = /^(?:[*#~]\s*){1,3}$/;

export const escapeXml = (text: string): string =>
  text
    .replace(CONTROL_CHARACTERS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Each line is a paragraph; a line with only "*", "***" or "#" is a scene break.
export const blocksOf = (text: string): Block[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line): Block => (SCENE_BREAK.test(line) ? { kind: 'break' } : { kind: 'paragraph', text: line }));

export const slugify = (text: string, fallback: string): string => {
  const slug = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-')
    .slice(0, 60);

  return slug || fallback;
};
