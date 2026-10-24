import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test/render';
import { DatePicker } from './DatePicker';
import type { DatePickerProps } from './DatePicker';

function Controlled(props: Partial<DatePickerProps>) {
  const [value, setValue] = useState(props.value ?? '');
  return (
    <DatePicker
      label="Appointment date"
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
      {...props}
    />
  );
}

describe('DatePicker', () => {
  it('accepts ISO typed entry and announces the formatted date', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const input = screen.getByLabelText('Appointment date');
    await user.type(input, '2026-10-19');

    expect(input).toHaveValue('2026-10-19');
    expect(screen.getByText(/Monday, 19 October 2026/i)).toBeInTheDocument();
  });

  it('rejects an impossible typed date with an inline error', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByLabelText('Appointment date'), '2026-02-30');
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a date like/i);
  });

  it('opens the dialog, supports arrow keys, and selects with Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled value="2026-10-19" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    const first = await screen.findByRole('button', { name: /Monday, 19 October 2026/i });
    await waitFor(() => expect(first).toHaveFocus());

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /Tuesday, 20 October 2026/i })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('2026-10-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Appointment date')).toHaveFocus();
  });

  it('pages months with PageDown and Home/End', async () => {
    const user = userEvent.setup();
    render(<Controlled value="2026-10-19" />);

    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await screen.findByRole('button', { name: /Monday, 19 October 2026/i });

    await user.keyboard('{PageDown}');
    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument();

    await user.keyboard('{Home}');
    expect(screen.getByRole('button', { name: /Sunday, 1 November 2026/i })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('button', { name: /Monday, 30 November 2026/i })).toHaveFocus();
  });

  it('disables dates outside min/max and custom disabled dates', async () => {
    const user = userEvent.setup();
    render(
      <Controlled
        value="2026-10-19"
        min="2026-10-10"
        max="2026-10-25"
        disabledDates={(date) => date === '2026-10-20'}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open calendar' }));

    expect(screen.getByRole('button', { name: /Friday, 9 October 2026/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Tuesday, 20 October 2026/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Monday, 26 October 2026/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Monday, 19 October 2026/i })).toBeEnabled();
  });

  it('closes on Escape and returns focus to the input', async () => {
    const user = userEvent.setup();
    render(<Controlled value="2026-10-19" />);

    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Appointment date')).toHaveFocus();
  });

  it('shows the configured time zone', () => {
    render(<Controlled value="2026-10-19" timeZone="Europe/Berlin" />);
    expect(screen.getByText(/Monday, 19 October 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Europe\/Berlin/)).toBeInTheDocument();
  });
});
