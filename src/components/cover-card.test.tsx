import { render, screen } from '@testing-library/react';
import { CoverCard } from './cover-card';

describe('CoverCard', () => {
  it('shows the cover image inside the book mockup', () => {
    const { container } = render(<CoverCard title="Dune" coverUrl="/media/cover.webp" />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/cover.webp');
  });

  it('shows the title when there is no cover', () => {
    render(<CoverCard title="Dune" coverUrl={null} />);

    expect(screen.getByText('Dune')).toBeInTheDocument();
  });
});
