import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { useZodForm } from './useZodForm';

const schema = z.object({
  fullName: z.string().min(3, 'Enter at least 3 characters.'),
  quantity: z.number().int('Whole units only.').min(1, 'Order at least one.'),
});

type Values = z.output<typeof schema>;

function FormFixture({ onValid }: { onValid: (values: Values) => void }) {
  const form = useZodForm(schema, { fullName: '', quantity: 0 });

  return (
    <form onSubmit={form.handleSubmit(onValid)} noValidate>
      <label htmlFor="fullName">Full name</label>
      <input id="fullName" {...form.register('fullName')} />
      {form.formState.errors.fullName && (
        <p role="alert">{form.formState.errors.fullName.message}</p>
      )}

      <label htmlFor="quantity">Quantity</label>
      <input id="quantity" type="number" {...form.register('quantity', { valueAsNumber: true })} />
      {form.formState.errors.quantity && <p role="alert">{form.formState.errors.quantity.message}</p>}

      <button type="submit">Save</button>
      <button type="button" onClick={() => form.reset()}>
        Reset
      </button>
    </form>
  );
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
}

function alertTexts(): string[] {
  return screen.getAllByRole('alert').map((alert) => alert.textContent ?? '');
}

describe('useZodForm', () => {
  it('starts from the default values it is given', () => {
    render(<FormFixture onValid={vi.fn()} />);

    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(screen.getByLabelText('Quantity')).toHaveValue(0);
  });

  it('withholds errors until the first submit', () => {
    render(<FormFixture onValid={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'a' } });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the schema’s own messages and never calls the submit handler', async () => {
    const onValid = vi.fn();
    render(<FormFixture onValid={onValid} />);

    submit();

    await screen.findAllByRole('alert');
    expect(alertTexts()).toEqual(['Enter at least 3 characters.', 'Order at least one.']);
    expect(onValid).not.toHaveBeenCalled();
  });

  it('hands the validated values to the submit handler', async () => {
    const onValid = vi.fn();
    render(<FormFixture onValid={onValid} />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Patient' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } });
    submit();

    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));
    // handleSubmit forwards (values, event), so the data is the first argument.
    expect(onValid.mock.calls[0]?.[0]).toEqual({ fullName: 'Ada Patient', quantity: 3 });
  });

  it('re-validates as the user edits after a failed submit', async () => {
    const onValid = vi.fn();
    render(<FormFixture onValid={onValid} />);

    submit();
    await screen.findAllByRole('alert');

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Patient' } });

    await waitFor(() => expect(alertTexts()).not.toContain('Enter at least 3 characters.'));
    // The other field is still short, and nothing was submitted meanwhile.
    expect(alertTexts()).toEqual(['Order at least one.']);
    expect(onValid).not.toHaveBeenCalled();
  });

  it('rejects a fractional quantity with the schema message', async () => {
    const onValid = vi.fn();
    render(<FormFixture onValid={onValid} />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Patient' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2.5' } });
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Whole units only.');
    expect(onValid).not.toHaveBeenCalled();
  });

  it('restores the default values on reset', async () => {
    const onValid = vi.fn();
    render(<FormFixture onValid={onValid} />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Patient' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
    submit();
    await waitFor(() => expect(onValid).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(screen.getByLabelText('Quantity')).toHaveValue(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
