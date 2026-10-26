import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getBrowserTimeZone,
  isValidTimeZone,
  readStoredTimeZone,
  storeTimeZone,
} from './time-zone';

export interface TimeZoneContextValue {
  /** The zone the signed-in user chose, falling back to the browser zone. */
  timeZone: string;
  /** The device/browser zone, shown alongside `timeZone` when they differ. */
  browserTimeZone: string;
  setTimeZone: (zone: string) => void;
}

const TimeZoneContext = createContext<TimeZoneContextValue>({
  timeZone: getBrowserTimeZone(),
  browserTimeZone: getBrowserTimeZone(),
  setTimeZone: () => {},
});

export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [browserTimeZone] = useState(getBrowserTimeZone);
  const [timeZone, setTimeZoneState] = useState(readStoredTimeZone);

  const setTimeZone = useCallback((zone: string) => {
    if (!isValidTimeZone(zone)) return;
    setTimeZoneState(zone);
    storeTimeZone(zone);
  }, []);

  const value = useMemo(
    () => ({ timeZone, browserTimeZone, setTimeZone }),
    [timeZone, browserTimeZone, setTimeZone],
  );

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}

export function useTimeZone(): TimeZoneContextValue {
  return useContext(TimeZoneContext);
}
