import type { EventId } from '@/lib/writing/events';
import type { GoalFilter, GoalUnit, Mood, ProjectStatus, ProjectType } from '@/lib/writing/schema';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  'not-started': 'Not started (0%)',
  'in-progress': 'In progress',
  completed: 'Completed',
  'on-hiatus': 'On hiatus',
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  novel: 'Novel',
  novella: 'Novella',
  'short-stories': 'Short stories',
  nonfiction: 'Nonfiction',
  memoir: 'Memoir',
  poetry: 'Poetry',
  script: 'Script',
  other: 'Other',
};

export const UNIT_LABELS: Record<GoalUnit, string> = {
  words: 'words',
  hours: 'hours',
  minutes: 'minutes',
  lines: 'lines',
  pages: 'pages',
};

export const MOOD_LABELS: Record<Mood, string> = {
  inspired: 'Inspired',
  steady: 'Steady',
  tired: 'Tired',
  stuck: 'Stuck',
  proud: 'Proud',
};

export const EVENT_LABELS: Record<EventId, string> = {
  november: 'November novel: 50,000 words in 30 days',
  'april-camp': 'April camp: 30,000 words',
  'july-camp': 'July camp: 30,000 words',
};

export const GOAL_FILTER_LABELS: Record<GoalFilter, string> = {
  all: 'All',
  active: 'In progress',
  upcoming: 'Upcoming',
  ended: 'Ended',
};

export const GENRE_SUGGESTIONS = [
  'Romance',
  'Fantasy',
  'Science fiction',
  'Mystery',
  'Thriller',
  'Horror',
  'Historical',
  'Literary',
  'Young adult',
  'Drama',
  'Comedy',
  'Adventure',
  'Short story',
  'Fan fiction',
];
