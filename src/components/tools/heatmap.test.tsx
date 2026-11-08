import { fireEvent, screen } from '@testing-library/react';
import type { ToolData } from '@/lib/tools/data';
import { renderWithLocale } from '@/test/render';
import Heatmap, { shadeOf } from './heatmap';

const data: ToolData = {
  today: '2026-11-08',
  novels: [],
  wordsByDay: [
    { date: '2025-03-01', count: 10 },
    { date: '2026-11-07', count: 300 },
    { date: '2026-11-08', count: 700 },
  ],
};

describe('Heatmap', () => {
  it('shows the year of today with totals and labeled days', () => {
    renderWithLocale(<Heatmap data={data} />);

    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nov 8, 2026: 700 words' })).toHaveAttribute('aria-current', 'date');
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('2 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
    expect(screen.getByText('Jan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nov 7, 2026: 300 words' }));
    expect(screen.getByRole('status')).toHaveTextContent('Nov 7, 2026: 300 words');
  });

  it('moves between years down to the first year with writing', () => {
    renderWithLocale(<Heatmap data={data} />, 'pt-BR');

    fireEvent.click(screen.getByRole('button', { name: 'Ano anterior' }));
    expect(screen.getByRole('heading', { name: '2025' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ano anterior' })).toBeDisabled();
    expect(screen.getByText('Toque em um dia para ver as palavras.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próximo ano' }));
    expect(screen.getByRole('heading', { name: '2026' })).toBeInTheDocument();
  });

  it('shades the levels from paper to accent', () => {
    expect(shadeOf(0)).toBe('var(--paper)');
    expect(shadeOf(4)).toContain('100%');
  });
});
