// Every tool runs in the browser and keeps its work on the device. Titles and descriptions are
// English keys translated by the interface.
export const TOOL_CATEGORIES = ['write', 'review', 'story', 'rhythm', 'export'] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CATEGORY_NAMES: Record<ToolCategory, string> = {
  write: 'Write',
  review: 'Review the text',
  story: 'Build the story',
  rhythm: 'Pace and habit',
  export: 'Export',
};

export type Tool = { id: string; category: ToolCategory; title: string; description: string };

export const TOOLS = [
  {
    id: 'focus',
    category: 'write',
    title: 'Focus editor',
    description: 'Full screen, no menus, live word count. Typewriter mode and no backspace if you want them.',
  },
  {
    id: 'counter',
    category: 'write',
    title: 'Word counter',
    description: 'Paste or write your text and log the new words to your goal in one tap.',
  },
  {
    id: 'sprint-text',
    category: 'write',
    title: 'Sprint with text',
    description: 'A timed sprint with a page that counts the words you write while the clock runs.',
  },
  {
    id: 'dont-stop',
    category: 'write',
    title: 'Don’t stop',
    description: 'Stop typing for a few seconds and the page starts to turn red. A gentle push past the block.',
  },
  {
    id: 'drafts',
    category: 'write',
    title: 'Drafts and snapshots',
    description:
      'Everything you write here is saved on this device, with a snapshot every few minutes to undo accidents.',
  },
  {
    id: 'text-stats',
    category: 'review',
    title: 'Passage stats',
    description: 'Repeated words, sentences that run too long, adverbs ending in -mente and reading time.',
  },
  {
    id: 'readability',
    category: 'review',
    title: 'Readability',
    description: 'The Flesch reading ease score adapted to Portuguese, with what it means.',
  },
  {
    id: 'repetition',
    category: 'review',
    title: 'Repetition highlighter',
    description: 'Colors the words you use too often inside each paragraph.',
  },
  {
    id: 'dialogue',
    category: 'review',
    title: 'Dialogue and narration',
    description: 'How much of the chapter is dialogue and how much is narration.',
  },
  {
    id: 'names',
    category: 'story',
    title: 'Name generator',
    description: 'Names by era and region, from lists that come with the app.',
  },
  {
    id: 'characters',
    category: 'story',
    title: 'Character sheet',
    description: 'Looks, goal, fear and arc for each character of your novel.',
  },
  {
    id: 'timeline',
    category: 'story',
    title: 'Timeline',
    description: 'Events by chapter that you can move around.',
  },
  {
    id: 'scenes',
    category: 'story',
    title: 'Scene board',
    description: 'Scene cards across planned, written and revised.',
  },
  {
    id: 'ideas',
    category: 'story',
    title: 'Idea generator',
    description: 'A genre, popular tropes, a character, a place and a conflict drawn at random to get you unstuck.',
  },
  {
    id: 'plot-dice',
    category: 'story',
    title: 'Plot dice',
    description: 'What happens now? Roll for a twist.',
  },
  {
    id: 'goal-calculator',
    category: 'rhythm',
    title: 'Goal calculator',
    description: 'Pick a finish date and see how many words a day you need, updated as you write.',
  },
  {
    id: 'heatmap',
    category: 'rhythm',
    title: 'Year heatmap',
    description: 'One square per day of the year, darker on the days you wrote more.',
  },
  {
    id: 'pomodoro',
    category: 'rhythm',
    title: 'Pomodoro',
    description: 'Write and rest in rounds, with the soft alarm clock between them.',
  },
  {
    id: 'reminder',
    category: 'rhythm',
    title: 'Writing reminder',
    description: 'A notification at your writing time while the app is open on this device.',
  },
  {
    id: 'manuscript',
    category: 'export',
    title: 'Manuscript',
    description: 'Your drafts as a .docx or a printable PDF in the format publishers expect.',
  },
  {
    id: 'epub',
    category: 'export',
    title: 'ePub book',
    description: 'Read your own book on an e-reader or a phone.',
  },
  {
    id: 'converter',
    category: 'export',
    title: 'EPUB converter',
    description:
      'Turn a .docx, .odt, .md, .txt or .html file into an ePub you can read on an e-reader or send to Kindle, right in the browser.',
  },
  {
    id: 'backup',
    category: 'export',
    title: 'Full backup',
    description: 'Everything the tools saved on this device in one .zip, and a way to bring it back.',
  },
] as const satisfies readonly Tool[];

export type ToolId = (typeof TOOLS)[number]['id'];

export const toolById = (id: string): Tool | undefined => TOOLS.find((tool) => tool.id === id);

// Favorites come first, in the order they were picked; the rest keep the catalog order.
export const orderByFavorites = (tools: readonly Tool[], favorites: readonly string[]): Tool[] => [
  ...favorites.flatMap((id) => tools.filter((tool) => tool.id === id)),
  ...tools.filter((tool) => !favorites.includes(tool.id)),
];

export const toggleFavorite = (favorites: readonly string[], id: string): string[] =>
  favorites.includes(id) ? favorites.filter((favorite) => favorite !== id) : [...favorites, id];

export const readFavorites = (raw: string | null): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');

    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && !!toolById(id)) : [];
  } catch {
    return [];
  }
};
