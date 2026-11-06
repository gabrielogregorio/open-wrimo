import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormState } from '@/lib/form';
import type { ProfileView } from '@/lib/writing/repository';
import { renderWithLocale } from '@/test/render';
import { ProfileForm } from './profile-form';

const profile: ProfileView = {
  bio: 'I write at night.',
  location: 'Lisbon',
  writingTime: 'Late',
  favoriteBooks: 'Dune',
  favoriteAuthors: 'Le Guin',
  avatarUrl: '/api/images/avatar',
  isPublic: true,
  shown: { bio: true, stats: false, favorites: true, badges: false },
};

describe('ProfileForm', () => {
  it('fills the fields from the saved profile and sends them', async () => {
    const action = vi.fn(async (_state: FormState, _formData: FormData): Promise<FormState> => ({ saved: true }));
    renderWithLocale(<ProfileForm action={action} profile={profile} name="Ana" username="ana" />);

    expect(screen.getByLabelText('Name')).toHaveValue('Ana');
    expect(screen.getByLabelText('Username')).toHaveValue('ana');
    expect(screen.getByRole('textbox', { name: 'About me' })).toHaveValue('I write at night.');
    expect(screen.getByLabelText('Where I write')).toHaveValue('Lisbon');
    expect(screen.getByLabelText('When I write')).toHaveValue('Late');
    expect(screen.getByLabelText('Favorite books')).toHaveValue('Dune');
    expect(screen.getByLabelText('Favorite authors')).toHaveValue('Le Guin');
    expect(screen.getByRole('checkbox', { name: 'Anyone with the link can see my profile' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Numbers' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Favorites' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Remove the picture' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/write/profile');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const formData = action.mock.calls[0][1];

    expect(formData.get('name')).toBe('Ana');
    expect(formData.get('isPublic')).toBe('on');
    expect(formData.getAll('show')).toEqual(['bio', 'favorites']);
  });

  it('shows the errors and keeps the typed values', async () => {
    const action = async (): Promise<FormState> => ({
      error: 'Something went wrong.',
      fieldErrors: { name: 'Enter a name up to 80 characters.', bio: 'Too long.' },
      values: {
        name: 'Bia',
        username: 'bia',
        isPublic: '',
        bio: 'Long bio',
        location: 'Porto',
        writingTime: 'Dawn',
        favoriteBooks: '',
        favoriteAuthors: '',
      },
    });
    renderWithLocale(
      <ProfileForm action={action} profile={{ ...profile, isPublic: false }} name="Ana" username="ana" />,
    );

    expect(screen.getByRole('checkbox', { name: 'Anyone with the link can see my profile' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.');
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Enter a name up to 80 characters.');
    expect(screen.getByRole('textbox', { name: 'About me' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Too long.')).toBeInTheDocument();
    expect(screen.getByLabelText('Where I write')).toHaveValue('Porto');
    expect(screen.getByLabelText('Favorite books')).not.toHaveAttribute('aria-invalid');
  });
});
