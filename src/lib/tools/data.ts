// What the server hands every tool page: the writer's novels with their open word goals and the words
// written per day. Tools that only work on text ignore it.
export type ToolGoal = { id: string; name: string; target: number; total: number; startDate: string; endDate: string };

export type ToolNovel = { id: string; title: string; totalWords: number; goals: ToolGoal[] };

export type ToolData = { today: string; novels: ToolNovel[]; wordsByDay: { date: string; count: number }[] };
