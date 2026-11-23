import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from '../test/render';
import { TextField } from './TextField';

describe('TextField (#290)', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Street address" value="" onChange={() => undefined} />);

    expect(screen.getByRole('textbox', { name: 'Street address' })).toBeInTheDocument();
  });

  it('accepts a typed value through the passed-through props', async () => {
    const onChange = vi.fn();
    render(<TextField label="City" defaultValue="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'City' }), 'Ikeja');

    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'City' })).toHaveValue('Ikeja');
  });

  it('uses an explicit id when the caller supplies one', () => {
    render(<TextField id="key-name" label="Key name" value="" onChange={() => undefined} />);

    const input = screen.getByRole('textbox', { name: 'Key name' });
    expect(input).toHaveAttribute('id', 'key-name');
    expect(screen.getByLabelText('Key name')).toBe(input);
  });

  it('points aria-describedby at the hint only when there is no error', () => {
    render(<TextField label="Longitude" hint="Decimal degrees, -180 to 180." value="" onChange={() => undefined} />);

    const input = screen.getByRole('textbox', { name: /longitude/i });
    expect(input).toHaveAttribute('aria-describedby', `${input.id}-hint`);
    expect(input).toHaveAccessibleDescription('Decimal degrees, -180 to 180.');
  });

  it('marks the input invalid and describes it with the error', () => {
    render(<TextField label="Price per unit (XLM)" error="Enter a whole number of stroops." value="" onChange={() => undefined} />);

    const input = screen.getByRole('textbox', { name: 'Price per unit (XLM)' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a whole number of stroops.');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number of stroops.');
  });

  it('lists the hint before the error when both are present', () => {
    render(
      <TextField
        label="Contact phone"
        hint="Include the country code."
        error="That number looks too short."
        value=""
        onChange={() => undefined}
      />,
    );

    const input = screen.getByRole('textbox', { name: /contact phone/i });
    const [hintId, errorId] = [`${input.id}-hint`, `${input.id}-error`];
    expect(input).toHaveAttribute('aria-describedby', `${hintId} ${errorId}`);
    expect(input).toHaveAccessibleDescription('Include the country code. That number looks too short.');
  });

  it('is not marked invalid while the error is empty', () => {
    render(<TextField label="Email" error="" value="" onChange={() => undefined} />);

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByText('Email', { selector: 'label' })).toBeInTheDocument();
  });

  it('leaves aria-describedby off when there is no hint or error', () => {
    render(<TextField label="Search catalog items" value="" onChange={() => undefined} />);

    const input = screen.getByRole('textbox', { name: 'Search catalog items' });
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('has no detectable axe violations with a hint and an error', async () => {
    const { container } = render(
      <TextField
        label="Effective from"
        type="datetime-local"
        hint="When the new price starts to apply."
        error="Pick a date."
        defaultValue=""
        onChange={() => undefined}
      />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
