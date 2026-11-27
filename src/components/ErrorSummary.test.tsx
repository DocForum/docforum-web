import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { render, screen } from '../test/render';
import { TextField } from './TextField';
import { ErrorSummary, errorSummaryItems } from './ErrorSummary';

function LongForm() {
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [submitCount, setSubmitCount] = useState(0);
  const errors =
    submitCount > 0
      ? {
          city: city ? undefined : 'City is required.',
          phone: phone ? undefined : 'Contact phone is required.',
        }
      : {};
  const items = errorSummaryItems(errors, { city: 'f-city', phone: 'f-phone' });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitCount((count) => count + 1);
      }}
    >
      <ErrorSummary items={items} submitCount={submitCount} />
      <TextField id="f-city" label="City" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} />
      <TextField id="f-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
      <button type="submit">Save</button>
    </form>
  );
}

describe('ErrorSummary (#242)', () => {
  it('renders nothing before a failed submit', () => {
    render(<LongForm />);
    expect(screen.queryByRole('heading', { name: /problem/ })).not.toBeInTheDocument();
  });

  it('moves focus to the summary on a failed submit and links to each field', async () => {
    const user = userEvent.setup();
    render(<LongForm />);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const heading = screen.getByRole('heading', { name: 'There are 2 problems with this form' });
    const summary = heading.parentElement!;
    expect(summary).toHaveFocus();
    expect(summary).toHaveAttribute('aria-labelledby', heading.id);

    const cityLink = screen.getByRole('link', { name: 'City is required.' });
    expect(cityLink).toHaveAttribute('href', '#f-city');
    expect(screen.getByRole('link', { name: 'Contact phone is required.' })).toHaveAttribute('href', '#f-phone');

    await user.click(cityLink);
    expect(screen.getByLabelText('City')).toHaveFocus();
  });

  it('updates as errors are fixed without stealing focus', async () => {
    const user = userEvent.setup();
    render(<LongForm />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('link', { name: 'City is required.' }));
    await user.type(screen.getByLabelText('City'), 'Ikeja');

    expect(screen.getByRole('heading', { name: 'There is 1 problem with this form' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'City is required.' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('City')).toHaveFocus();

    // Leaving the summary does not pull focus back (no keyboard trap).
    await user.tab();
    expect(screen.getByLabelText('City')).not.toHaveFocus();
  });

  it('includes server-side field errors and skips fields without a message', () => {
    const items = errorSummaryItems(
      { email: 'That email is already registered.', name: undefined, other: 'ignored' },
      { name: 'f-name', email: 'f-email' },
    );
    expect(items).toEqual([{ fieldId: 'f-email', message: 'That email is already registered.' }]);
  });

  it('has no axe violations when shown', async () => {
    const user = userEvent.setup();
    const { container } = render(<LongForm />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
