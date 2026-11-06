import { screen, within } from '@testing-library/react';
import type { DailyPoint } from '@/lib/writing/stats';
import { renderWithLocale } from '@/test/render';
import { WritingChart } from './writing-chart';

const labels = { day: 'Day', written: 'Written', total: 'Total', par: 'Par' };

const points: DailyPoint[] = [
  { date: '2026-11-01', count: 1000, cumulative: 1000, par: 1667 },
  { date: '2026-11-02', count: 0, cumulative: 1000, par: 3333 },
  { date: '2026-11-03', count: 2500, cumulative: 3500, par: 5000 },
];

describe('WritingChart', () => {
  it('lists every day in the accessible table with formatted numbers', () => {
    renderWithLocale(
      <WritingChart
        points={points}
        daysElapsed={2}
        title="Your month"
        labels={labels}
        formatDay={(date) => `day ${date.slice(8)}`}
        formatNumber={(value) => `#${value}`}
      />,
    );

    const table = screen.getByRole('table', { name: 'Your month' });
    const rows = within(table).getAllByRole('row');

    expect(rows).toHaveLength(4);
    expect(within(rows[3]).getByRole('rowheader')).toHaveTextContent('day 03');
    expect(
      within(rows[3])
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['#2500', '#3500', '#5000']);
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      'Day',
      'Written',
      'Total',
      'Par',
    ]);
  });

  it('draws the total line only up to the days elapsed', () => {
    const { container } = renderWithLocale(
      <WritingChart
        points={points}
        daysElapsed={2}
        title="Your month"
        labels={labels}
        formatDay={(date) => date}
        formatNumber={String}
      />,
    );

    const [par, total] = container.querySelectorAll('polyline');

    expect(par.getAttribute('points')?.split(' ')).toHaveLength(3);
    expect(total.getAttribute('points')?.split(' ')).toHaveLength(2);
    expect(container.querySelectorAll('rect')).toHaveLength(3);
  });

  it('renders an empty chart without failing', () => {
    const { container } = renderWithLocale(
      <WritingChart
        points={[]}
        daysElapsed={0}
        title="Nothing yet"
        labels={labels}
        formatDay={String}
        formatNumber={String}
      />,
    );

    expect(screen.getByRole('table', { name: 'Nothing yet' })).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });
});
