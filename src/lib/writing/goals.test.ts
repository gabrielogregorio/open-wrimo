import { currentGoal, entriesForGoal, filterGoals, withStats } from './goals';
import type { EntryView, GoalView } from './repository';

const goal = (id: string, startDate: string, endDate: string): GoalView => ({
  id,
  projectId: 'p1',
  name: id,
  unit: 'words',
  target: 1000,
  startDate,
  endDate,
});

const entry = (overrides: Partial<EntryView>): EntryView => ({
  id: 'e',
  projectId: 'p1',
  unit: 'words',
  date: '2026-11-02',
  count: 100,
  mood: null,
  place: '',
  source: 'update',
  hour: -1,
  createdAt: '2026-11-02T12:00:00.000Z',
  ...overrides,
});

describe('goals', () => {
  const november = goal('november', '2026-11-01', '2026-11-30');
  const april = goal('april', '2026-04-01', '2026-04-30');
  const next = goal('next', '2027-01-01', '2027-01-31');

  it('counts only entries of the same project, unit and dates', () => {
    const counted = entriesForGoal(november, [
      entry({ id: 'yes' }),
      entry({ id: 'other project', projectId: 'p2' }),
      entry({ id: 'hours', unit: 'hours' }),
      entry({ id: 'before', date: '2026-10-31' }),
      entry({ id: 'after', date: '2026-12-01' }),
    ]);

    expect(counted.map((item) => item.id)).toEqual(['yes']);
  });

  it('filters by state and picks the goal in progress', () => {
    const goals = withStats([next, november, april], [entry({})], '2026-11-05');

    expect(goals[1].stats.total).toBe(100);
    expect(filterGoals(goals, 'all')).toHaveLength(3);
    expect(filterGoals(goals, 'active').map((item) => item.id)).toEqual(['november']);
    expect(filterGoals(goals, 'upcoming').map((item) => item.id)).toEqual(['next']);
    expect(filterGoals(goals, 'ended').map((item) => item.id)).toEqual(['april']);
    expect(currentGoal(goals)?.id).toBe('november');
    expect(currentGoal(withStats([april], [], '2026-11-05'))?.id).toBe('april');
    expect(currentGoal([])).toBeNull();
  });
});
