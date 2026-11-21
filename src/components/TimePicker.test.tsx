import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { renderWithProviders } from '../test/render';
import { TimePicker, type TimePickerProps } from './TimePicker';

function Harness(props: Partial<TimePickerProps> & { initial?: string }) {
  const { initial = '', ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <>
      <TimePicker label="Opens" timeZone="Africa/Lagos" {...rest} value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const valueOf = () => screen.getByTestId('value').textContent;
const input = () => screen.getByRole('combobox', { name: 'Opens' });

describe('TimePicker', () => {
  it.each([
    ['14:30', '14:30'],
    ['2:30 pm', '14:30'],
    ['0915', '09:15'],
  ])('accepts typed %j', async (typed, expected) => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    await user.type(input(), typed);
    expect(valueOf()).toBe(expected);
    await user.tab();
    expect(input()).toHaveValue(expected === '14:30' ? '2:30 PM' : '9:15 AM');
  });

  it('explains an invalid or out-of-range time on blur', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness min="08:00" max="18:00" />);
    await user.type(input(), '25:00');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a time like 14:30 or 2:30 pm.');
    expect(valueOf()).toBe('');

    await user.clear(input());
    await user.type(input(), '7am');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent(/between 8:00\s?AM and 6:00\s?PM/);
    expect(valueOf()).toBe('07:00');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
  });

  it('opens suggestions with ArrowDown, moves with arrows, picks with Enter', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="09:00" min="08:00" max="10:00" step={30} />);
    await user.click(input());
    await user.keyboard('{ArrowDown}');

    expect(input()).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'Opens' });
    expect(listbox).toBeVisible();
    // Starts on the current value; aria-activedescendant points at it.
    const active = () => document.getElementById(input().getAttribute('aria-activedescendant')!);
    expect(active()).toHaveTextContent(/9:00\s?AM/);

    await user.keyboard('{ArrowDown}{Enter}');
    expect(valueOf()).toBe('09:30');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveFocus();
  });

  it('filters suggestions as you type and closes on Escape without losing text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness step={60} />);
    await user.type(input(), '1');
    const labels = screen.getAllByRole('option').map((option) => option.textContent ?? '');
    expect(labels).toEqual(expect.arrayContaining([expect.stringMatching(/^1:00/), expect.stringMatching(/^10:00/)]));
    expect(labels.length).toBeLessThan(24);

    await user.keyboard('{Escape}');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('1');
  });

  it('states the explicit time zone in the description', () => {
    renderWithProviders(<Harness />);
    expect(input()).toHaveAccessibleDescription(/Times in Africa\/Lagos/);
  });

  it('has no axe violations open', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<Harness initial="09:00" />);
    await user.click(input());
    await user.keyboard('{ArrowDown}');
    expect(await axe(container)).toHaveNoViolations();
  });
});
