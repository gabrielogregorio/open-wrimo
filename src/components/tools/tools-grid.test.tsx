import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { I18nProvider } from '@/components/i18n-provider';
import { renderWithLocale } from '@/test/render';
import { FAVORITES_KEY, ToolsGrid } from './tools-grid';

describe('ToolsGrid', () => {
  beforeEach(() => window.localStorage.clear());

  it('lists every tool by category with its description and a link', () => {
    renderWithLocale(<ToolsGrid />);

    expect(screen.getByRole('heading', { name: 'Write' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Focus editor/ })).toHaveAttribute('href', '/write/tools/focus');
    expect(screen.queryByRole('heading', { name: 'Favorite tools' })).not.toBeInTheDocument();
  });

  it('stars a tool into the favorites and remembers it on this device', async () => {
    renderWithLocale(<ToolsGrid />);

    await userEvent.click(screen.getByRole('button', { name: 'Favorite Year heatmap' }));

    const favorites = screen.getByRole('heading', { name: 'Favorite tools' }).closest('section') as HTMLElement;
    expect(within(favorites).getByRole('link', { name: /Year heatmap/ })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? '[]')).toEqual(['heatmap']);

    await userEvent.click(within(favorites).getByRole('button', { name: 'Favorite Year heatmap' }));

    expect(screen.queryByRole('heading', { name: 'Favorite tools' })).not.toBeInTheDocument();
  });

  it('brings back stored favorites and survives storage that throws', async () => {
    window.localStorage.setItem(FAVORITES_KEY, '["epub"]');
    renderWithLocale(<ToolsGrid />);

    expect(await screen.findByRole('heading', { name: 'Favorite tools' })).toBeInTheDocument();

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { unmount } = renderWithLocale(<ToolsGrid />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Favorite Plot dice' })[1]);

    expect(screen.getAllByRole('button', { name: 'Favorite Plot dice', pressed: true }).length).toBeGreaterThan(0);
    getItem.mockRestore();
    setItem.mockRestore();
    unmount();
  });

  it('renders no favorites on the server, before the browser storage is read', () => {
    window.localStorage.setItem(FAVORITES_KEY, '["epub"]');
    const html = renderToString(
      <I18nProvider locale="en-US">
        <ToolsGrid />
      </I18nProvider>,
    );

    expect(html).not.toContain('Favorites');
  });
});
