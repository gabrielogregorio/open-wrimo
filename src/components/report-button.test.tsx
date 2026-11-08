import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { reportAction } from '@/app/actions/moderation';
import type { FormState } from '@/lib/form';
import { renderWithLocale } from '@/test/render';
import { ReportButton } from './report-button';

vi.mock('@/app/actions/moderation', () => ({ reportAction: vi.fn() }));

const mockedReport = vi.mocked(reportAction);

const sentFields = (): Record<string, FormDataEntryValue> =>
  Object.fromEntries((mockedReport.mock.calls[0][1] as FormData).entries());

describe('ReportButton', () => {
  it('opens and closes the report form in the page', async () => {
    renderWithLocale(<ReportButton target="profile" username="ana" />);
    const toggle = screen.getByRole('button', { name: 'Report profile' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('form')).not.toBeInTheDocument();

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Report profile' })).toBeInTheDocument();
    expect(screen.getByText(/Reports are anonymous to the reported person/)).toBeInTheDocument();
    expect(screen.getByLabelText('Details (optional)')).not.toBeRequired();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel report' }));

    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    await userEvent.click(toggle);
    await userEvent.click(toggle);

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('sends a novel report and thanks the reader', async () => {
    mockedReport.mockResolvedValue({ saved: true });
    renderWithLocale(<ReportButton target="novel" username="ana" projectId="p1" />);

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
    renderWithLocale(<ReportButton target="profile" username="ana" />, 'pt-BR');

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
    renderWithLocale(<ReportButton target="profile" username="ana" />);

    await userEvent.click(screen.getByRole('button', { name: 'Report profile' }));
    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'spam');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('button', { name: 'Sending report…' })).toBeDisabled();

    waiting.forEach((resolve) => resolve({ saved: true }));

    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});
