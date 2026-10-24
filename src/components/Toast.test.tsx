import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from '../store/toast-store';
import { Toaster } from './Toast';

beforeEach(() => {
  useToastStore.getState().clear();
});

afterEach(() => {
  vi.useRealTimers();
  useToastStore.getState().clear();
});

describe('Toaster', () => {
  it('announces successes politely and errors assertively', () => {
    render(<Toaster />);
    act(() => {
      toast.success('Invitation sent.');
      toast.error('Could not save.');
    });

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Invitation sent.');
    expect(status).toHaveAttribute('aria-live', 'polite');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not save.');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('auto-dismisses after the timeout', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.info('Saved.', { duration: 1000 });
    });

    expect(screen.getByText('Saved.')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('pauses the timeout while hovered and resumes on mouse leave', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.info('Saved.', { duration: 1000 });
    });

    const toastNode = screen.getByText('Saved.').closest('[role="status"]') as HTMLElement;
    fireEvent.mouseEnter(toastNode);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Saved.')).toBeInTheDocument();

    fireEvent.mouseLeave(toastNode);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('runs an action and dismisses the toast', () => {
    const onClick = vi.fn();
    render(<Toaster />);
    act(() => {
      toast.success('Message archived.', { action: { label: 'Undo', onClick } });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Message archived.')).not.toBeInTheDocument();
  });

  it('can be dismissed with the close button and keeps focus-safe labels', () => {
    render(<Toaster />);
    act(() => {
      toast.error('Upload failed.');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Upload failed.')).not.toBeInTheDocument();
  });

  it('caps the viewport at four toasts', () => {
    render(<Toaster />);
    act(() => {
      for (let index = 0; index < 6; index += 1) toast.info(`Toast ${index}`);
    });

    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.getByText('Toast 5')).toBeInTheDocument();
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
  });
});
