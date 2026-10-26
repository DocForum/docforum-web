import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../test/render';
import { TimePicker } from './TimePicker';

function Controlled(props: Partial<React.ComponentProps<typeof TimePicker>>) {
  const [value, setValue] = useState(props.value ?? '');
  return (
    <TimePicker
      label="Appointment time"
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange?.(next);
      }}
      {...props}
    />
  );
}

describe('TimePicker', () => {
  it('accepts typed 12-hour and 24-hour entry', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const input = screen.getByLabelText('Appointment time');
    await user.type(input, '9:30 PM');
    expect(input).toHaveValue('21:30');

    await user.clear(input);
    await user.type(input, '08:15');
    expect(input).toHaveValue('08:15');
  });

  it('rejects an invalid typed time', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByLabelText('Appointment time'), '25:00');
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a time like/i);
  });

  it('opens a listbox, moves with arrow keys, and chooses with Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled value="09:00" min="09:00" max="10:00" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Open time options' }));
    const list = await screen.findByRole('listbox', { name: /appointment time options/i });
    const selected = within(list).getByRole('option', { name: '09:00' });
    await waitFor(() => expect(selected).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(within(list).getByRole('option', { name: '09:30' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith('09:30');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Appointment time')).toHaveFocus();
  });

  it('limits options to min/max and the step', async () => {
    const user = userEvent.setup();
    render(<Controlled min="09:00" max="10:00" stepMinutes={30} />);

    await user.click(screen.getByRole('button', { name: 'Open time options' }));
    const list = await screen.findByRole('listbox');
    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      '09:00',
      '09:30',
      '10:00',
    ]);
  });

  it('closes on Escape and shows the time zone', async () => {
    const user = userEvent.setup();
    render(<Controlled value="09:00" timeZone="Europe/Berlin" />);

    expect(screen.getByText(/Europe\/Berlin/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open time options' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Appointment time')).toHaveFocus();
  });
});
