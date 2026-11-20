import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { renderWithProviders } from '../test/render';
import { MAX_VISIBLE_TOASTS, showToast, useToastStore } from '../store/toast-store';
import { ToastRegion } from './Toast';

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastRegion', () => {
  it('keeps both live regions mounted even with no toasts', () => {
    renderWithProviders(<ToastRegion />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('announces info politely and errors assertively', () => {
    renderWithProviders(<ToastRegion />);
    act(() => {
      showToast({ message: 'Saved.', tone: 'success' });
      showToast({ message: 'Could not save.', tone: 'error' });
    });
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
  });

  it('never moves focus when a toast appears', async () => {
    renderWithProviders(
      <>
        <button type="button">Elsewhere</button>
        <ToastRegion />
      </>,
    );
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' });
    elsewhere.focus();
    act(() => {
      showToast({ message: 'Done.', action: { label: 'Undo', onAction: () => {} } });
    });
    expect(elsewhere).toHaveFocus();
  });

  it('dismisses with its close button and with Escape', async () => {
    renderWithProviders(<ToastRegion />);
    const user = userEvent.setup();
    act(() => {
      showToast({ message: 'First' });
      showToast({ message: 'Second' });
    });

    await user.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]);
    expect(screen.queryByText('First')).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Dismiss notification' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Second')).not.toBeInTheDocument();
  });

  it('runs the action and dismisses the toast', async () => {
    const onAction = vi.fn();
    renderWithProviders(<ToastRegion />);
    act(() => {
      showToast({ message: 'Archived.', action: { label: 'Undo', onAction } });
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Archived.')).not.toBeInTheDocument();
  });

  it('auto-dismisses after its duration, pausing while hovered or focused', () => {
    vi.useFakeTimers();
    renderWithProviders(<ToastRegion />);
    act(() => {
      showToast({ message: 'Heads up', durationMs: 1_000 });
    });
    const toast = screen.getByTestId('toast');

    act(() => vi.advanceTimersByTime(600));
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    fireEvent.focus(screen.getByRole('button', { name: 'Dismiss notification' }));
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    fireEvent.blur(screen.getByRole('button', { name: 'Dismiss notification' }));
    act(() => vi.advanceTimersByTime(399));
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();
  });

  it('keeps a toast with durationMs: null until dismissed', () => {
    vi.useFakeTimers();
    renderWithProviders(<ToastRegion />);
    act(() => {
      showToast({ message: 'Sticky', durationMs: null });
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it(`caps the stack at ${MAX_VISIBLE_TOASTS}, dropping the oldest`, () => {
    renderWithProviders(<ToastRegion />);
    act(() => {
      for (let i = 1; i <= MAX_VISIBLE_TOASTS + 2; i += 1) showToast({ message: `Toast ${i}` });
    });
    expect(useToastStore.getState().toasts).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText(`Toast ${MAX_VISIBLE_TOASTS + 2}`)).toBeInTheDocument();
  });

  it('has no axe violations with mixed toasts', async () => {
    const { container } = renderWithProviders(<ToastRegion />);
    act(() => {
      showToast({ message: 'Saved.', tone: 'success', action: { label: 'Undo', onAction: () => {} } });
      showToast({ message: 'Failed.', tone: 'error' });
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
