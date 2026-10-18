import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { onlineManager } from '@tanstack/react-query';
import { render, screen } from '../test/render';
import { OfflineBanner } from './OfflineBanner';

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('OfflineBanner (#85)', () => {
  it('stays quiet while online', () => {
    render(<OfflineBanner />);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
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
});
