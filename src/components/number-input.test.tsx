import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLocale } from '@/test/render';
import { NumberInput } from './number-input';

const hiddenValue = (container: HTMLElement, name: string): string | undefined =>
  container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;

describe('NumberInput', () => {
  it('keeps only digits, formats them for the locale and sends the raw number', async () => {
    const { container } = renderWithLocale(<NumberInput name="target" label="Target" />);
    const input = screen.getByLabelText('Target');

    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
    await userEvent.type(input, '00a12b345');

    expect(input).toHaveValue('12,345');
    expect(hiddenValue(container, 'target')).toBe('12345');
    expect(input).toHaveAttribute('id', 'field-target');
  });

  it('formats in Portuguese and limits the number of digits', async () => {
    const { container } = renderWithLocale(
      <NumberInput name="count" label="Contagem" defaultValue="0050000" maxDigits={4} />,
      'pt-BR',
    );
    const input = screen.getByLabelText('Contagem');

    expect(input).toHaveValue('5.000');
    await userEvent.type(input, '9');

    expect(hiddenValue(container, 'count')).toBe('5000');
  });

  it('clears the shown value when every digit is removed', async () => {
    renderWithLocale(<NumberInput name="target" label="Target" defaultValue="12" placeholder="50,000" />);
    const input = screen.getByLabelText('Target');

    await userEvent.clear(input);

    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('placeholder', '50,000');
  });

  it('describes the field with the hint and the error', () => {
    renderWithLocale(
      <NumberInput id="goal-target" name="target" label="Target" hint="Whole words only." error="Too big." />,
    );
    const input = screen.getByLabelText('Target');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'goal-target-hint goal-target-error');
    expect(input).toHaveAccessibleDescription('Whole words only. Too big.');
  });
});
