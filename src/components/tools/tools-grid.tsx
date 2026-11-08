'use client';

import {
  BookOpen,
  CalendarDays,
  Calculator,
  Clapperboard,
  Dices,
  Download,
  Eye,
  FileOutput,
  FileText,
  Flame,
  Gauge,
  Highlighter,
  History,
  Hourglass,
  Lightbulb,
  ListOrdered,
  MessagesSquare,
  PenLine,
  Star,
  Timer,
  BellRing,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import {
  TOOL_CATEGORIES,
  TOOL_CATEGORY_NAMES,
  TOOLS,
  orderByFavorites,
  readFavorites,
  toggleFavorite,
  type ToolId,
} from '@/lib/tools/catalog';
import { useI18n } from '../i18n-provider';

export const FAVORITES_KEY = 'openwrimo-favorite-tools';

const ICONS: Record<ToolId, LucideIcon> = {
  focus: Eye,
  counter: Calculator,
  'sprint-text': Timer,
  'dont-stop': Flame,
  drafts: History,
  'text-stats': ListOrdered,
  readability: Gauge,
  repetition: Highlighter,
  dialogue: MessagesSquare,
  names: Users,
  characters: UserRound,
  timeline: CalendarDays,
  scenes: Clapperboard,
  ideas: Lightbulb,
  'plot-dice': Dices,
  'goal-calculator': PenLine,
  heatmap: CalendarDays,
  pomodoro: Hourglass,
  reminder: BellRing,
  manuscript: FileText,
  epub: BookOpen,
  converter: FileOutput,
  backup: Download,
};

const FAVORITES_EVENT = 'openwrimo-favorite-tools';

// Favorites live in this browser only. The server renders none, and the stored list takes over after load.
const readStored = (): string => {
  try {
    return window.localStorage.getItem(FAVORITES_KEY) ?? '[]';
  } catch {
    return '[]';
  }
};

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener(FAVORITES_EVENT, onChange);
  window.addEventListener('storage', onChange);

  return () => {
    window.removeEventListener(FAVORITES_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

// When the browser refuses storage, the list is kept here for the visit.
const visit = { unsaved: null as string | null };

const saveFavorites = (next: string): void => {
  try {
    window.localStorage.setItem(FAVORITES_KEY, next);
    visit.unsaved = null;
  } catch {
    visit.unsaved = next;
  }

  window.dispatchEvent(new Event(FAVORITES_EVENT));
};

export function ToolsGrid() {
  const { t } = useI18n();
  const stored = useSyncExternalStore(
    subscribe,
    () => visit.unsaved ?? readStored(),
    () => '[]',
  );
  const favorites = useMemo(() => readFavorites(stored), [stored]);

  const flip = (id: string) => saveFavorites(JSON.stringify(toggleFavorite(favorites, id)));

  const card = (tool: (typeof TOOLS)[number]) => {
    const Icon = ICONS[tool.id];
    const favorite = favorites.includes(tool.id);

    return (
      <li key={tool.id} className="sheet relative flex rounded-sm">
        <Link
          href={`/write/tools/${tool.id}`}
          className="flex min-h-28 flex-1 items-start gap-3 p-4 pr-12 hover:bg-paper-deep/50">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-1">
            <span className="font-display text-base font-semibold">{t(tool.title)}</span>
            <span className="text-sm text-ink-soft">{t(tool.description)}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => flip(tool.id)}
          aria-pressed={favorite}
          aria-label={t('Favorite {tool}', { tool: t(tool.title) })}
          className="absolute top-1 right-1 grid h-11 w-11 place-items-center rounded-full text-accent hover:bg-paper-deep">
          <Star className="h-5 w-5" fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </li>
    );
  };

  const favoriteTools = orderByFavorites(TOOLS, favorites).filter((tool) => favorites.includes(tool.id));

  return (
    <div className="flex flex-col gap-8">
      {favoriteTools.length > 0 ? (
        <section aria-labelledby="tools-favorites" className="flex flex-col gap-3">
          <h2 id="tools-favorites" className="font-display text-xl font-semibold">
            {t('Favorites')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteTools.map((tool) => card(tool as (typeof TOOLS)[number]))}
          </ul>
        </section>
      ) : null}
      {TOOL_CATEGORIES.map((category) => (
        <section key={category} aria-labelledby={`tools-${category}`} className="flex flex-col gap-3">
          <h2 id={`tools-${category}`} className="font-display text-xl font-semibold">
            {t(TOOL_CATEGORY_NAMES[category])}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((tool) => tool.category === category).map(card)}
          </ul>
        </section>
      ))}
    </div>
  );
}
