import { afterEach, describe, expect, it } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { TimeZoneProvider, useTimeZone } from '../TimeZoneProvider';
import { DualZoneTime } from './ZonedTime';
import { TIME_ZONE_STORAGE_KEY } from '../time-zone';

function wrapper({ children }: { children: ReactNode }) {
  return <TimeZoneProvider>{children}</TimeZoneProvider>;
}

afterEach(() => {
  window.localStorage.removeItem(TIME_ZONE_STORAGE_KEY);
});

describe('TimeZoneProvider', () => {
  it('falls back to the browser zone and persists an explicit preference', () => {
    window.localStorage.removeItem(TIME_ZONE_STORAGE_KEY);
    const { result } = renderHook(() => useTimeZone(), { wrapper });

    expect(result.current.timeZone).toBe(result.current.browserTimeZone);

    act(() => result.current.setTimeZone('Asia/Tokyo'));

    expect(result.current.timeZone).toBe('Asia/Tokyo');
    expect(window.localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBe('Asia/Tokyo');
  });

  it('ignores an invalid zone instead of writing it', () => {
    const { result } = renderHook(() => useTimeZone(), { wrapper });
    const original = result.current.timeZone;

    act(() => result.current.setTimeZone('Not/AZone'));

    expect(result.current.timeZone).toBe(original);
    expect(window.localStorage.getItem(TIME_ZONE_STORAGE_KEY)).toBeNull();
  });
});

describe('DualZoneTime', () => {
  it('shows both labels only when the zones differ', () => {
    window.localStorage.setItem(TIME_ZONE_STORAGE_KEY, 'UTC');
    const { rerender } = render(
      <TimeZoneProvider>
        <DualZoneTime
          value="2026-10-18T23:30:00.000Z"
          counterpartZone="Asia/Tokyo"
          counterpartLabel="Clinic time"
        />
      </TimeZoneProvider>,
    );

    expect(screen.getByText(/Your time/)).toBeInTheDocument();
    expect(screen.getByText(/Clinic time/)).toBeInTheDocument();
    expect(screen.getByText(/Oct 18, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Oct 19, 2026/)).toBeInTheDocument();

    rerender(
      <TimeZoneProvider>
        <DualZoneTime value="2026-10-18T23:30:00.000Z" counterpartZone="UTC" />
      </TimeZoneProvider>,
    );

    expect(screen.queryByText(/Your time/)).not.toBeInTheDocument();
    expect(screen.getByText(/Oct 18, 2026/)).toBeInTheDocument();
  });
});
