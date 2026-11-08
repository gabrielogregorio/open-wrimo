import { countWords } from '../words';

export type DialogueShare = { dialogueWords: number; narrationWords: number; dialoguePercent: number };

// A line opened by a dash (— or –, or a hyphen followed by a space) is a speech. Inside it, the narrator
// may cut in between dashes: "— Vamos — disse ela. — Agora." Pieces alternate speech and narration.
const DASH_START = /^(?:[—–]|-\s)/;
const INNER_DASH = /\s[—–]\s?/;
const CLOSING_QUOTE: Record<string, string> = { '“': '”', '"': '"' };

// The text between quotes; a quote left open runs to the end of the line.
const quotedText = (line: string): string => {
  let closing: string | null = null;
  let quoted = '';

  for (const char of line) {
    if (closing === null) {
      closing = CLOSING_QUOTE[char] ?? null;
    } else if (char === closing) {
      closing = null;
      quoted += ' ';
    } else {
      quoted += char;
    }
  }

  return quoted;
};

const dashLine = (line: string): [number, number] => {
  const pieces = line.trimStart().replace(DASH_START, '').split(INNER_DASH);

  return pieces.reduce<[number, number]>(
    ([dialogue, narration], piece, index) =>
      index % 2 === 0 ? [dialogue + countWords(piece), narration] : [dialogue, narration + countWords(piece)],
    [0, 0],
  );
};

const quotedLine = (line: string): [number, number] => {
  const total = countWords(line);
  const dialogue = countWords(quotedText(line));

  return [dialogue, total - dialogue];
};

export const dialogueShare = (text: string): DialogueShare => {
  const [dialogueWords, narrationWords] = text.split('\n').reduce<[number, number]>(
    ([dialogue, narration], line) => {
      const [lineDialogue, lineNarration] = DASH_START.test(line.trimStart()) ? dashLine(line) : quotedLine(line);

      return [dialogue + lineDialogue, narration + lineNarration];
    },
    [0, 0],
  );
  const total = dialogueWords + narrationWords;

  return {
    dialogueWords,
    narrationWords,
    dialoguePercent: total === 0 ? 0 : Math.round((dialogueWords / total) * 100),
  };
};
