import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { onlineManager } from '@tanstack/react-query';
import { render, screen, waitFor } from '../test/render';
import userEvent from '@testing-library/user-event';
import { OfflineBanner } from './OfflineBanner';
import { useApiReachabilityStore } from '../store/api-reachability-store';
import * as healthService from '../services/system-health-service';

beforeEach(() => {
  onlineManager.setOnline(true);
  useApiReachabilityStore.getState().reset();
});

afterEach(() => {
  onlineManager.setOnline(true);
  useApiReachabilityStore.getState().reset();
  vi.restoreAllMocks();
});

describe('OfflineBanner (#85)', () => {
  it('stays quiet while online and API is reachable', () => {
    render(<OfflineBanner />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/server is waking up/i)).not.toBeInTheDocument();
  });

  it('shows an offline status and clears when the connection returns', () => {
    render(<OfflineBanner />);

    act(() => {
      onlineManager.setOnline(false);
    });
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole('status').some((region) => /paused until then/i.test(region.textContent ?? '')),
    ).toBe(true);

    act(() => {
      onlineManager.setOnline(true);
    });
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('status').some((region) => /back online/i.test(region.textContent ?? '')),
    ).toBe(true);
  });

  it('shows distinct server waking up banner when API is unreachable and announces recovery', () => {
    render(<OfflineBanner />);

    act(() => {
      useApiReachabilityStore.getState().markUnreachable();
    });
    expect(screen.getByText(/our server is waking up \/ unreachable/i)).toBeInTheDocument();
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    act(() => {
      useApiReachabilityStore.getState().markReachable();
    });
    expect(screen.queryByText(/our server is waking up \/ unreachable/i)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('status').some((region) => /server connected/i.test(region.textContent ?? '')),
    ).toBe(true);
  });

  it('retries liveness check when Retry button is clicked', async () => {
    const user = userEvent.setup();
    const pingSpy = vi.spyOn(healthService, 'pingHealthLive').mockImplementation(async () => {
      useApiReachabilityStore.getState().markReachable();
      return true;
    });

    useApiReachabilityStore.getState().markUnreachable();
    render(<OfflineBanner />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    expect(pingSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText(/our server is waking up \/ unreachable/i)).not.toBeInTheDocument();
    });
  });

  it('offline status takes precedence over API unreachable', () => {
    act(() => {
      useApiReachabilityStore.getState().markUnreachable();
    });
    render(<OfflineBanner />);

    expect(screen.getByText(/our server is waking up \/ unreachable/i)).toBeInTheDocument();

    act(() => {
      onlineManager.setOnline(false);
    });
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/our server is waking up \/ unreachable/i)).not.toBeInTheDocument();

    act(() => {
      onlineManager.setOnline(true);
    });
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    expect(screen.getByText(/our server is waking up \/ unreachable/i)).toBeInTheDocument();
  });
});
