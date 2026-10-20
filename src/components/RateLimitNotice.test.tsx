import { afterEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen } from '../test/render';
import { RateLimitNotice } from './RateLimitNotice';
import { useRateLimitStore } from '../store/rate-limit-store';

afterEach(() => {
  // Wrap in act: RTL's auto-cleanup runs after this hook, so the notice may
  // still be mounted when the store resets.
  act(() => useRateLimitStore.getState().clear());
});

describe('RateLimitNotice', () => {
  it('shows a non-blocking countdown when a 429 is recorded', () => {
    useRateLimitStore.getState().notify(2);

    render(<RateLimitNotice />);

    const notice = screen.getByTestId('rate-limit-notice');
    expect(notice).toHaveTextContent('Too many requests');
    expect(notice).toHaveTextContent('2 seconds');
  });

  it('renders nothing when there is no active limit', () => {
    render(<RateLimitNotice />);
    expect(screen.queryByTestId('rate-limit-notice')).not.toBeInTheDocument();
  });

  it('can be dismissed', async () => {
    useRateLimitStore.getState().notify(30);
    const user = userEvent.setup();

    render(<RateLimitNotice />);
    await user.click(screen.getByRole('button', { name: /dismiss rate limit notice/i }));

    expect(screen.queryByTestId('rate-limit-notice')).not.toBeInTheDocument();
  });
});
