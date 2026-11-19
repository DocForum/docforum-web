import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { renderWithProviders } from '../test/render';
import { DatePicker, type DatePickerProps } from './DatePicker';

function Harness(props: Partial<DatePickerProps> & { initial?: string; onValue?: (value: string) => void }) {
  const { initial = '', onValue, ...rest } = props;
  const [value, setValue] = useState(initial);
  return (
    <>
      <DatePicker
        label="Appointment date"
        timeZone="UTC"
        {...rest}
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue?.(next);
        }}
      />
      <output data-testid="value">{value}</output>
      <button type="button">After</button>
    </>
  );
}

const valueOf = () => screen.getByTestId('value').textContent;
const openButton = () => screen.getByRole('button', { name: /^choose date/i });
const focusedCell = () => document.activeElement as HTMLElement;

describe('DatePicker — typed entry', () => {
  it('accepts a typed date in the locale order and reports ISO', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Appointment date' });

    await user.type(input, '11/25/2026');
    expect(valueOf()).toBe('2026-11-25');
    await user.tab();
    expect(input).toHaveValue('11/25/2026');
  });

  it('accepts ISO in any locale and normalises the display on blur', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    const input = screen.getByRole('textbox', { name: 'Appointment date' });
    await user.type(input, '2026-01-02');
    await user.tab();
    expect(valueOf()).toBe('2026-01-02');
    expect(input).toHaveValue('01/02/2026');
  });

  it('explains an invalid date on blur, and reports no date', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="2026-11-25" />);
    const input = screen.getByRole('textbox', { name: 'Appointment date' });
    await user.clear(input);
    await user.type(input, '02/30/2026');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();

    expect(valueOf()).toBe('');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a real date in the format MM/DD/YYYY.');
    expect(input.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id);
  });

  it('rejects typed dates outside min/max or disabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness min="2026-11-10" max="2026-11-30" isDateDisabled={(iso) => iso === '2026-11-20'} />,
    );
    const input = screen.getByRole('textbox', { name: 'Appointment date' });

    await user.type(input, '11/01/2026');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent(/or later/);

    await user.clear(input);
    await user.type(input, '11/20/2026');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent(/is not available/);
    // Like native constraint validation: reported, but flagged invalid, so
    // the form's own validation decides what to do with it.
    expect(valueOf()).toBe('2026-11-20');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the format hint as the field description', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByRole('textbox', { name: 'Appointment date' })).toHaveAccessibleDescription(
      'Format: MM/DD/YYYY.',
    );
  });
});

describe('DatePicker — calendar dialog (keyboard)', () => {
  it('opens a modal dialog with focus on the selected date', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="2026-11-25" />);

    await user.click(openButton());

    const dialog = screen.getByRole('dialog', { name: 'November 2026' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-25');
    expect(focusedCell()).toHaveAttribute('aria-selected', 'true');
    expect(focusedCell()).toHaveAccessibleName('Wednesday, November 25, 2026');
  });

  it('moves by day, week, week edge, month and year', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="2026-11-25" />);
    await user.click(openButton());

    await user.keyboard('{ArrowRight}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-26');
    await user.keyboard('{ArrowDown}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-12-03');
    // The heading (a polite live region) follows the month.
    expect(screen.getByRole('heading', { name: 'December 2026' })).toHaveAttribute('aria-live', 'polite');
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-25');
    await user.keyboard('{Home}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-22'); // en-US weeks start Sunday
    await user.keyboard('{End}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-28');
    await user.keyboard('{PageDown}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-12-28');
    await user.keyboard('{Shift>}{PageUp}{/Shift}');
    expect(focusedCell()).toHaveAttribute('data-date', '2025-12-28');
  });

  it('selects with Enter, closes, and returns focus to the button', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    renderWithProviders(<Harness initial="2026-11-25" onValue={onValue} />);
    await user.click(openButton());

    await user.keyboard('{ArrowRight}{Enter}');

    expect(onValue).toHaveBeenCalledWith('2026-11-26');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openButton()).toHaveFocus();
    expect(openButton()).toHaveAccessibleName('Choose date, selected Thursday, November 26, 2026');
    expect(openButton()).toHaveAccessibleDescription('Appointment date');
    expect(screen.getByRole('textbox', { name: 'Appointment date' })).toHaveValue('11/26/2026');
  });

  it('Escape closes without changing the value', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="2026-11-25" />);
    await user.click(openButton());
    await user.keyboard('{ArrowRight}{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openButton()).toHaveFocus();
    expect(valueOf()).toBe('2026-11-25');
  });

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial="2026-11-25" />);
    await user.click(openButton());
    const dialog = screen.getByRole('dialog');

    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('keeps focus within min/max and refuses unavailable days', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    renderWithProviders(
      <Harness
        initial="2026-11-11"
        min="2026-11-10"
        max="2026-11-20"
        isDateDisabled={(iso) => iso === '2026-11-12'}
        onValue={onValue}
      />,
    );
    await user.click(openButton());

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-10');
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-12');
    expect(focusedCell()).toHaveAttribute('aria-disabled', 'true');
    expect(focusedCell()).toHaveAccessibleName('Thursday, November 12, 2026, unavailable');
    await user.keyboard('{Enter}');
    expect(onValue).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{PageDown}');
    expect(focusedCell()).toHaveAttribute('data-date', '2026-11-20');
  });

  it('marks today in the explicit time zone', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z'));
    const user = userEvent.setup();
    renderWithProviders(<Harness timeZone="Africa/Lagos" />);
    await user.click(openButton());
    // 23:30 UTC is already the 26th in Lagos.
    const grid = screen.getByRole('grid');
    expect(within(grid).getByRole('gridcell', { current: 'date' })).toHaveAttribute('data-date', '2026-11-26');
    expect(screen.getByText('Today in Africa/Lagos')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('has no axe violations closed or open', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<Harness initial="2026-11-25" />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(openButton());
    expect(await axe(container)).toHaveNoViolations();
  });
});
