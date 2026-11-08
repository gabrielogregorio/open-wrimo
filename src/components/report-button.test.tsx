import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reportAction } from '@/app/actions/moderation';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { ReportButton } from './report-button';

vi.mock('@/app/actions/moderation', () => ({ reportAction: vi.fn() }));

const mockedReport = vi.mocked(reportAction);

const PROFILE = { title: 'Ana Lima', imageUrl: '/media/avatars/u/a.webp', description: <p>Escrevo de madrugada.</p> };
const NOVEL = { title: 'Rio de Janeiro', imageUrl: '/media/covers/u/c.webp', description: 'Uma cidade em chamas.' };

const sentFields = (): Record<string, FormDataEntryValue> =>
  Object.fromEntries((mockedReport.mock.calls[0][1] as FormData).entries());

describe('ReportButton', () => {
  it('opens an accessible dialog with what is being reported, and closes it three ways', async () => {
    const user = userEvent.setup();
    renderWithLocale(<ReportButton target="profile" username="ana" preview={PROFILE} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Report profile' }));

    const dialog = screen.getByRole('dialog', { name: 'Report profile' });
    expect(dialog).toHaveAccessibleDescription('Check that this is what you want to report.');
    const preview = screen.getByRole('region', { name: 'What you are reporting' });
    expect(preview).toHaveTextContent('Ana Lima');
    expect(preview).toHaveTextContent('Escrevo de madrugada.');
    expect(preview.querySelector('img')).toHaveAttribute('src', '/media/avatars/u/a.webp');
    expect(screen.getByText(/Reports are anonymous to the reported person/)).toBeInTheDocument();
    expect(screen.getByLabelText('Details (optional)')).not.toBeRequired();

    await user.click(screen.getByRole('button', { name: 'Cancel report' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Report profile' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Report profile' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a novel without an image or description as just its title', async () => {
    renderWithLocale(
      <ReportButton target="novel" username="ana" projectId="p1" preview={{ title: 'Sem capa', imageUrl: null }} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Report novel' }));
    const preview = screen.getByRole('region', { name: 'What you are reporting' });

    expect(preview).toHaveTextContent('Sem capa');
    expect(preview.querySelector('img')).toBeNull();
  });

  it('sends a novel report and thanks the reader', async () => {
    mockedReport.mockResolvedValue({ saved: true });
    renderWithLocale(<ReportButton target="novel" username="ana" projectId="p1" preview={NOVEL} />);

    await userEvent.click(screen.getByRole('button', { name: 'Report novel' }));
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'copyright');
    await userEvent.type(screen.getByLabelText('Details (optional)'), 'Copied from a published book.');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Your report was sent to the moderation team.');
    expect(sentFields()).toEqual({
      target: 'novel',
      username: 'ana',
      projectId: 'p1',
      reason: 'copyright',
      details: 'Copied from a published book.',
    });
  });

  it('asks for details when the reason is "other" and shows the errors it gets back', async () => {
    mockedReport.mockResolvedValue({
      error: 'Too many reports sent from here. Try again in {minutes} minutes.',
      errorValues: { minutes: 4 },
      fieldErrors: { reason: 'Choose a reason.', details: 'Tell us what is wrong.' },
    } satisfies FormState);
    renderWithLocale(<ReportButton target="profile" username="ana" preview={PROFILE} />, 'pt-BR');

    await userEvent.click(screen.getByRole('button', { name: 'Denunciar perfil' }));
    await userEvent.selectOptions(screen.getByLabelText('Motivo'), 'other');
    const details = screen.getByLabelText('O que está errado?');

    expect(details).toBeRequired();

    await userEvent.type(details, 'Estranho.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar denúncia' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Tente de novo em 4 minutos.');
    expect(screen.getByLabelText('Motivo')).toHaveAccessibleDescription('Escolha um motivo.');
    expect(details).toHaveAccessibleDescription('Conte o que está errado.');
  });

  it('shows a pending label while the report is sent', async () => {
    const waiting: ((state: FormState) => void)[] = [];
    mockedReport.mockImplementation(
      () =>
        new Promise<FormState>((resolve) => {
          waiting.push(resolve);
        }),
    );
    renderWithLocale(<ReportButton target="profile" username="ana" preview={PROFILE} />);

    await userEvent.click(screen.getByRole('button', { name: 'Report profile' }));
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'spam');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('button', { name: 'Sending report…' })).toBeDisabled();

    waiting.forEach((resolve) => resolve({ saved: true }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
