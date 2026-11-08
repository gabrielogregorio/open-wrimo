import { render, screen } from '@testing-library/react';
import { TermsDocument, withLinks } from './terms-document';

describe('TermsDocument', () => {
  it('shows the version, a table of contents and every section', () => {
    render(<TermsDocument />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Termos de Uso e Política de Privacidade' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/8 de novembro de 2026, às 20:00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '12. Exclusão da conta' })).toHaveAttribute('href', '#exclusao');
    expect(screen.getByRole('heading', { level: 2, name: '17. Lei e foro' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('list').length).toBeGreaterThan(5);
  });

  it('links e-mails and https addresses inside the text', () => {
    render(<TermsDocument />);

    expect(screen.getAllByRole('link', { name: 'gabriel.gregorio.1@outlook.com' })[0]).toHaveAttribute(
      'href',
      'mailto:gabriel.gregorio.1@outlook.com',
    );
    expect(screen.getByRole('link', { name: 'https://github.com/gabrielogregorio/open-wrimo' })).toBeInTheDocument();
    expect(withLinks('sem links').join('')).toBe('sem links');
    expect(withLinks('Escreva para ana@site.com.')).toEqual(['Escreva', ' para', ' ', expect.anything(), '.']);
  });
});
