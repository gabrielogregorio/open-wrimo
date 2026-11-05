import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setLocaleAction, setThemeAction } from '@/app/actions/preferences';
import { renderWithLocale } from '@/test/render';
import { PreferencesMenu } from './preferences-menu';

vi.mock('@/app/actions/preferences', () => ({
  setLocaleAction: vi.fn(async () => undefined),
  setThemeAction: vi.fn(async () => undefined),
}));

describe('PreferencesMenu', () => {
  afterEach(() => {
    document.documentElement.lang = '';
    delete document.documentElement.dataset.theme;
    window.history.replaceState(null, '', '/');
  });

  it('shows the current choices', () => {
    renderWithLocale(<PreferencesMenu theme="night" />, 'pt-BR');

    expect(screen.getByLabelText('Idioma')).toHaveValue('pt-BR');
    expect(screen.getByLabelText('Tema')).toHaveDisplayValue('Noturno (sem luz azul)');
  });

  it('applies a theme at once and saves it', async () => {
    renderWithLocale(<PreferencesMenu theme="system" />);

    await userEvent.selectOptions(screen.getByLabelText('Theme'), 'Night (no blue light)');

    expect(document.documentElement.dataset.theme).toBe('night');
    expect(setThemeAction).toHaveBeenCalledWith('night');
  });

  it('switches the language and drops the lang query that would override it', async () => {
    window.history.replaceState(null, '', '/login?lang=en&next=%2Fshelf');
    renderWithLocale(<PreferencesMenu theme="light" />);

    await userEvent.selectOptions(screen.getByLabelText('Language'), 'Português (Brasil)');

    expect(document.documentElement.lang).toBe('pt-BR');
    expect(window.location.search).toBe('?next=%2Fshelf');
    expect(setLocaleAction).toHaveBeenCalledWith('pt-BR');
  });

  it('keeps the address alone when it has no lang query', async () => {
    window.history.replaceState(null, '', '/shelf?status=reading');
    renderWithLocale(<PreferencesMenu theme="light" />, 'pt-BR');

    await userEvent.selectOptions(screen.getByLabelText('Idioma'), 'English');

    expect(window.location.search).toBe('?status=reading');
  });
});
