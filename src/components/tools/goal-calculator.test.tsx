import { fireEvent, screen } from '@testing-library/react';
import type { ToolData } from '@/lib/tools/data';
import { renderWithLocale } from '@/test/render';
import GoalCalculator from './goal-calculator';

const goal = { id: 'g1', name: 'Nov', target: 50000, total: 10000, startDate: '2026-11-01', endDate: '2026-11-30' };

const data: ToolData = {
  today: '2026-11-08',
  novels: [
    { id: 'n1', title: 'Primeiro', totalWords: 10000, goals: [goal] },
    { id: 'n2', title: 'Segundo', totalWords: 60000, goals: [] },
    { id: 'n3', title: 'Antigo', totalWords: 46000, goals: [{ ...goal, endDate: '2026-10-01' }] },
  ],
  wordsByDay: [{ date: '2026-11-08', count: 1400 }],
};

const change = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

describe('GoalCalculator', () => {
  it('fills the numbers from the novel and its goal', () => {
    renderWithLocale(<GoalCalculator data={data} />);

    expect(screen.getByLabelText('Target words')).toHaveValue('50,000');
    expect(screen.getByLabelText('Words so far')).toHaveValue('10,000');
    expect(screen.getByLabelText('Finish date')).toHaveValue('2026-11-30');
    expect(screen.getByText('1,740')).toBeInTheDocument();
    expect(screen.getByText('words a day for 23 days, today included')).toBeInTheDocument();
    expect(screen.getByText('200 a day')).toBeInTheDocument();
    expect(screen.getByText(/not enough yet/)).toBeInTheDocument();
  });

  it('reacts to other novels, manual numbers and dates', () => {
    renderWithLocale(<GoalCalculator data={data} />);

    change('Novel', 'n2');
    expect(screen.getByText('You already reached this target. Congratulations!')).toBeInTheDocument();

    change('Novel', 'n3');
    expect(screen.getByLabelText('Finish date')).toHaveValue('2026-12-07');
    expect(screen.getByText('Keep this pace and you get there in time.')).toBeInTheDocument();

    change('Novel', '');
    expect(screen.getByLabelText('Words so far')).toHaveValue('0');
    change('Words so far', '1.000x');
    expect(screen.getByLabelText('Words so far')).toHaveValue('1,000');
    change('Words so far', '');
    expect(screen.getByLabelText('Words so far')).toHaveValue('0');

    change('Finish date', '2026-11-01');
    expect(screen.getByText('words today: the finish date has passed')).toBeInTheDocument();
    change('Finish date', '');
    expect(screen.getByText('words a day for 1 days, today included')).toBeInTheDocument();
  });

  it('works without novels or recent writing', () => {
    renderWithLocale(<GoalCalculator data={{ today: '2026-11-08', novels: [], wordsByDay: [] }} />);

    expect(screen.queryByLabelText('Novel')).not.toBeInTheDocument();
    expect(screen.getByText('no recent writing yet')).toBeInTheDocument();
  });
});
