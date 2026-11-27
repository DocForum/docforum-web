import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { act, render, screen, fireEvent } from '../test/render';
import { useZodForm } from '../hooks/useZodForm';
import { PasswordField, PasswordInput } from './PasswordField';

function ControlledPassword({ onSubmit }: { onSubmit?: () => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <PasswordInput
        label="Password"
        autoComplete="current-password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

/** jsdom does not model lock keys, so stub the native modifier state. */
function pressKey(target: HTMLElement, type: 'keydown' | 'keyup', capsLock: boolean) {
  const event = new KeyboardEvent(type, { key: 'a', bubbles: true });
  Object.defineProperty(event, 'getModifierState', {
    value: (key: string) => key === 'CapsLock' && capsLock,
  });
  fireEvent(target, event);
}

const schema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters.') });

function HookFormPassword({ onValid }: { onValid: (data: { password: string }) => void }) {
  const form = useZodForm(schema, { password: '' });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onValid)} noValidate>
        <PasswordField name="password" label="Password" autoComplete="new-password" />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
}

describe('PasswordField (#243)', () => {
  it('reveals and re-masks the password with an aria-pressed toggle', async () => {
    const user = userEvent.setup();
    render(<ControlledPassword />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('keeps autocomplete for password managers', () => {
    render(<ControlledPassword />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('masks the field again when the form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ControlledPassword onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('shows a Caps Lock hint only while focused with Caps Lock on', () => {
    render(<ControlledPassword />);
    const input = screen.getByLabelText('Password');

    act(() => input.focus());
    pressKey(input, 'keydown', true);
    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('Caps Lock is on.');
    expect(input.getAttribute('aria-describedby')).toContain(hint.id);

    // Focus alone must not clear a known Caps Lock state.
    act(() => input.focus());
    expect(screen.getByRole('status')).toBeInTheDocument();

    pressKey(input, 'keyup', false);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    pressKey(input, 'keydown', true);
    act(() => input.blur());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('submits the typed password through react-hook-form', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<HookFormPassword onValid={onValid} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onValid).toHaveBeenCalledWith({ password: 'correct horse' }, expect.anything());
  });

  it('has no axe violations', async () => {
    const { container } = render(<ControlledPassword />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
