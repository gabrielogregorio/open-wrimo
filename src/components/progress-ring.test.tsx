import { screen } from '@testing-library/react';
import { renderWithLocale } from '@/test/render';
import { ProgressRing } from './progress-ring';

const fillOffset = (container: HTMLElement): number =>
  Number(container.querySelector('.ring-fill')?.getAttribute('stroke-dashoffset'));

describe('ProgressRing', () => {
  it('shows the value, the max and the caption', () => {
    renderWithLocale(<ProgressRing value={25} max={100} valueText="25" maxText="100" caption="words today" />);

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
    expect(screen.getByText('words today')).toBeInTheDocument();
  });

  it('fills the ring in proportion and clamps it between empty and full', () => {
    const circumference = 2 * Math.PI * 52;
    const { container, rerender } = renderWithLocale(
      <ProgressRing value={50} max={100} valueText="50" maxText="100" caption="half" />,
    );

    expect(fillOffset(container)).toBeCloseTo(circumference / 2);

    rerender(<ProgressRing value={500} max={100} valueText="500" maxText="100" caption="over" />);
    expect(fillOffset(container)).toBeCloseTo(0);

    rerender(<ProgressRing value={-5} max={100} valueText="-5" maxText="100" caption="under" />);
    expect(fillOffset(container)).toBeCloseTo(circumference);
  });

  it('stays empty when the max is zero', () => {
    const { container } = renderWithLocale(
      <ProgressRing value={10} max={0} valueText="10" maxText="0" caption="none" />,
    );

    expect(fillOffset(container)).toBeCloseTo(2 * Math.PI * 52);
  });
});
