import type { ToolData } from '@/lib/tools/data';

// Shared by the story tool tests.
export const storyData: ToolData = {
  today: '2026-11-08',
  novels: [
    { id: 'novel-1', title: 'A casa do rio', totalWords: 1200, goals: [] },
    { id: 'novel-2', title: 'Segundo livro', totalWords: 0, goals: [] },
  ],
  wordsByDay: [],
};

export const noNovels: ToolData = { today: '2026-11-08', novels: [], wordsByDay: [] };

// A predictable stand-in for Math.random that still changes on every call.
export const steppingRandom = (): (() => number) => {
  let step = 0;

  return () => {
    step += 1;

    return (step * 0.37) % 1;
  };
};
