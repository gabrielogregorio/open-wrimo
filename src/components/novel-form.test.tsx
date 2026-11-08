import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import type { ProjectView } from '@/lib/writing/repository';
import { renderWithLocale } from '@/test/render';
import { NovelForm } from './novel-form';

const novel = {
  id: 'p1',
  title: 'The Long Night',
  status: 'in-progress',
  type: 'novella',
  genres: ['Fantasy', 'Horror'],
  summary: 'A town without sunrise.',
  excerpt: '<p>It was dark.</p>',
  pinterestUrl: 'https://pinterest.com/board',
  playlistUrl: 'https://music.example/list',
  featured: true,
  isPublic: true,
  wordsBefore: 42000,
  awards: [],
  coverUrl: '/media/cover.webp',
  updatedAt: '2026-11-01T00:00:00.000Z',
} as ProjectView;

describe('NovelForm', () => {
  beforeEach(() => {
    document.elementFromPoint = vi.fn(() => null);
  });

  it('creates a novel with the repeating goal and the event fields', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({}));
    renderWithLocale(<NovelForm action={action} cancelHref="/desk" />);

    expect(screen.getByLabelText('Status')).toHaveValue('not-started');
    expect(screen.getByLabelText('What kind of project is it?')).toHaveValue('novel');
    expect(screen.getByLabelText('How much privacy do you want?')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Feature this novel on my desk' })).not.toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Remove the cover' })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Title'), 'First Draft');
    await userEvent.selectOptions(screen.getByLabelText('How often'), 'daily');
    await userEvent.type(screen.getByLabelText('Words each time'), '1667');
    await userEvent.click(screen.getByRole('button', { name: 'Create novel' }));

    const formData = action.mock.calls[0][1];

    expect(formData.get('title')).toBe('First Draft');
    expect(formData.get('period')).toBe('daily');
    expect(formData.get('periodTarget')).toBe('1667');
    expect(formData.get('event')).toBe('');
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/desk');
  });

  it('edits a novel with its saved values', () => {
    renderWithLocale(<NovelForm action={async () => ({})} cancelHref="/novels/p1" novel={novel} />);

    expect(screen.getByLabelText('Title')).toHaveValue('The Long Night');
    expect(screen.getByLabelText('Status')).toHaveValue('in-progress');
    expect(screen.getByLabelText('What kind of project is it?')).toHaveValue('novella');
    expect(screen.getByLabelText('How much privacy do you want?')).toHaveValue('on');
    expect(screen.getByLabelText('Words written before')).toHaveValue('42,000');
    expect(screen.getByLabelText('Summary')).toHaveValue('A town without sunrise.');
    expect(screen.getByLabelText('Pinterest board')).toHaveValue('https://pinterest.com/board');
    expect(screen.getByLabelText('Playlist')).toHaveValue('https://music.example/list');
    expect(screen.getByRole('checkbox', { name: 'Feature this novel on my desk' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Remove the cover' })).toBeInTheDocument();
    expect(screen.queryByLabelText('How often')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Join an event')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('shows the initial error, then the returned error, field errors and values', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'Something went wrong. Try again.',
      fieldErrors: { title: 'Enter a title up to 200 characters.', summary: 'Keep the summary under 2000 characters.' },
      values: { title: '', summary: 'Too long', status: 'completed', type: 'poetry', genres: 'Drama' },
    });
    renderWithLocale(<NovelForm action={action} cancelHref="/desk" initialError="That novel was not found." />);

    expect(screen.getByRole('alert')).toHaveTextContent('That novel was not found.');

    await userEvent.click(screen.getByRole('button', { name: 'Create novel' }));

    expect(await screen.findByText('Something went wrong. Try again.')).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Enter a title up to 200 characters.');
    expect(screen.getByLabelText('Summary')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Summary')).toHaveAccessibleDescription('Keep the summary under 2000 characters.');
    expect(screen.getByLabelText('Summary')).toHaveValue('Too long');
  });

  it('keeps the chosen status and type when the save comes back with an error', async () => {
    const action = async (): Promise<FormState> => ({
      fieldErrors: { title: 'Enter a title up to 200 characters.' },
      values: {
        title: '',
        status: 'completed',
        type: 'memoir',
        genres: '',
        isPublic: 'on',
        event: '',
        period: '',
        periodTarget: '',
      },
    });
    renderWithLocale(<NovelForm action={action} cancelHref="/desk" />);

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'completed');
    await userEvent.selectOptions(screen.getByLabelText('What kind of project is it?'), 'memoir');
    await userEvent.click(screen.getByRole('button', { name: 'Create novel' }));

    expect(await screen.findByText('Enter a title up to 200 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('completed');
    expect(screen.getByLabelText('What kind of project is it?')).toHaveValue('memoir');
    expect(screen.getByLabelText('How much privacy do you want?')).toHaveValue('on');
  });
});
