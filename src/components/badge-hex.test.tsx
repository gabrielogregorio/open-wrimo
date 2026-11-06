import { render, screen } from '@testing-library/react';
import { LIFETIME_BADGES, PARTICIPATION_BADGES, PERSONAL_BADGES, WRITING_BADGES } from '@/lib/writing/badges';
import { BadgeHex, BadgeIcon } from './badge-hex';

const streak = WRITING_BADGES.find((badge) => badge.id === 'streak-7')!;
const firstWords = WRITING_BADGES.find((badge) => badge.id === 'first-update')!;

describe('BadgeIcon', () => {
  it('draws writing badges as hexagons with the icon and the number', () => {
    const { container } = render(<BadgeIcon badge={streak} kind="writing" />);

    expect(container.querySelector('polygon')).toHaveAttribute('fill', '#b5412b');
    expect(container.querySelector('text')).toHaveTextContent('7');
    expect(container.querySelectorAll('svg svg')).toHaveLength(1);
    expect(container.firstElementChild).not.toHaveClass('grayscale');
  });

  it('uses a default tone for writing icons without their own color', () => {
    const { container } = render(<BadgeIcon badge={{ ...firstWords, glyph: 'book' }} kind="writing" />);

    expect(container.querySelector('polygon')).toHaveAttribute('fill', '#6b4423');
  });

  it('draws personal and participation badges as circles in their own colors', () => {
    const { container: personal } = render(<BadgeIcon badge={PERSONAL_BADGES[0]} kind="personal" earned={false} />);
    const { container: participation } = render(<BadgeIcon badge={PARTICIPATION_BADGES[0]} kind="participation" />);

    expect(personal.querySelector('circle')).toHaveAttribute('fill', '#6e4f7e');
    expect(personal.firstElementChild).toHaveClass('opacity-40', 'grayscale');
    expect(participation.querySelector('circle')).toHaveAttribute('fill', '#3f7d8c');
  });

  it('fits long marks in a smaller font', () => {
    const { container } = render(<BadgeIcon badge={LIFETIME_BADGES[0]} kind="writing" />);

    expect(container.querySelector('text')).toHaveAttribute('font-size', '22');
  });

  it('has an icon for every badge', () => {
    for (const badge of [...WRITING_BADGES, ...LIFETIME_BADGES, ...PERSONAL_BADGES, ...PARTICIPATION_BADGES]) {
      const { container, unmount } = render(<BadgeIcon badge={badge} kind="personal" />);

      expect(container.querySelector('svg svg')).toBeInTheDocument();
      unmount();
    }
  });
});

describe('BadgeHex', () => {
  it('names the badge and says whether it was earned', () => {
    render(
      <ul>
        <BadgeHex badge={streak} earned label="7 days" description="Wrote 7 days in a row." statusText="Earned" />
      </ul>,
    );

    expect(screen.getByRole('listitem')).toHaveClass('badge-earned');
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('Wrote 7 days in a row.')).toBeInTheDocument();
    expect(screen.getByText('Earned')).toHaveClass('sr-only');
  });

  it('dims a badge not earned yet', () => {
    render(
      <ul>
        <BadgeHex
          badge={PERSONAL_BADGES[1]}
          kind="personal"
          earned={false}
          label="Wellness"
          description="Rest"
          statusText="Not earned yet"
        />
      </ul>,
    );

    expect(screen.getByRole('listitem')).not.toHaveClass('badge-earned');
  });
});
