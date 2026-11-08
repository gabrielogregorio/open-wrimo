'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { ToolId } from '@/lib/tools/catalog';
import type { ToolData } from '@/lib/tools/data';

type ToolProps = { data: ToolData };

// Each tool is its own chunk, so a phone only downloads the one that is opened.
const TOOL_COMPONENTS: Record<ToolId, ComponentType<ToolProps>> = {
  focus: dynamic(() => import('@/components/tools/focus')),
  counter: dynamic(() => import('@/components/tools/counter')),
  'sprint-text': dynamic(() => import('@/components/tools/sprint-text')),
  'dont-stop': dynamic(() => import('@/components/tools/dont-stop')),
  drafts: dynamic(() => import('@/components/tools/drafts')),
  'text-stats': dynamic(() => import('@/components/tools/text-stats')),
  readability: dynamic(() => import('@/components/tools/readability')),
  repetition: dynamic(() => import('@/components/tools/repetition')),
  dialogue: dynamic(() => import('@/components/tools/dialogue')),
  names: dynamic(() => import('@/components/tools/names')),
  characters: dynamic(() => import('@/components/tools/characters')),
  timeline: dynamic(() => import('@/components/tools/timeline')),
  scenes: dynamic(() => import('@/components/tools/scenes')),
  ideas: dynamic(() => import('@/components/tools/ideas')),
  'plot-dice': dynamic(() => import('@/components/tools/plot-dice')),
  'goal-calculator': dynamic(() => import('@/components/tools/goal-calculator')),
  heatmap: dynamic(() => import('@/components/tools/heatmap')),
  pomodoro: dynamic(() => import('@/components/tools/pomodoro')),
  reminder: dynamic(() => import('@/components/tools/reminder')),
  manuscript: dynamic(() => import('@/components/tools/manuscript')),
  epub: dynamic(() => import('@/components/tools/epub')),
  backup: dynamic(() => import('@/components/tools/backup')),
};

export function ToolLoader({ id, data }: { id: ToolId; data: ToolData }) {
  const Tool = TOOL_COMPONENTS[id];

  return <Tool data={data} />;
}
