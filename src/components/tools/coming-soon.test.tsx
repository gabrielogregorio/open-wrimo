import { render, screen } from '@testing-library/react';
import { ComingSoon } from './coming-soon';

describe('ComingSoon', () => {
  it('says the tool is on its way', () => {
    render(<ComingSoon />);

    expect(screen.getByText('This tool is on its way.')).toBeInTheDocument();
  });
});
