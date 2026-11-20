import { useTimeZone } from '../TimeZoneProvider';
import { formatDateTime, formatTime, formatZoneName, isValidTimeZone, zonesDiffer } from '../time-zone';

interface ZonedTimeProps {
  value: string | number | Date | null | undefined;
  /** Overrides the user's preferred zone — e.g. the doctor's zone on a
   * shared appointment view. Must be a valid IANA zone. */
  timeZone?: string;
  mode?: 'date-time' | 'date' | 'time';
  className?: string;
}

const OPTIONS: Record<NonNullable<ZonedTimeProps['mode']>, Intl.DateTimeFormatOptions> = {
  'date-time': { dateStyle: 'medium', timeStyle: 'short' },
  date: { year: 'numeric', month: 'short', day: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
};

/** Renders an instant in the user's chosen zone (or an explicit one). */
export function ZonedTime({ value, timeZone, mode = 'date-time', className }: ZonedTimeProps) {
  const { timeZone: preferred } = useTimeZone();
  const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : preferred;

  if (value === null || value === undefined || value === '') {
    return <span className={className}>—</span>;
  }

  return (
    <time dateTime={new Date(value).toISOString()} className={className}>
      {formatDateTime(value, zone, OPTIONS[mode])}
    </time>
  );
}

interface DualZoneTimeProps {
  value: string | number | Date | null | undefined;
  /** The other participant's IANA zone, e.g. the doctor's stored zone. */
  counterpartZone?: string | null;
  counterpartLabel?: string;
  yourLabel?: string;
  mode?: 'date-time' | 'date' | 'time';
}

/**
 * Shows "your time / doctor's time" only when the zones actually differ
 * (issue #110). When they're the same — or the counterpart zone is unknown —
 * a single zoned timestamp is enough.
 */
export function DualZoneTime({
  value,
  counterpartZone,
  counterpartLabel = "Doctor's time",
  yourLabel = 'Your time',
  mode = 'date-time',
}: DualZoneTimeProps) {
  const { timeZone } = useTimeZone();
  const options = OPTIONS[mode];
  const otherValid = Boolean(counterpartZone && isValidTimeZone(counterpartZone));

  if (!otherValid || !zonesDiffer(timeZone, counterpartZone!)) {
    return <ZonedTime value={value} mode={mode} />;
  }

  return (
    <span>
      <span>
        {yourLabel}: {formatDateTime(value, timeZone, options)}
      </span>
      <span aria-hidden="true"> · </span>
      <span>
        {counterpartLabel} ({formatZoneName(counterpartZone!, value ?? new Date())}):{' '}
        {formatDateTime(value, counterpartZone!, options)}
      </span>
    </span>
  );
}

/** Time-only variant used by the live queue. */
export function ZonedClock({ value, timeZone }: { value: string | null | undefined; timeZone?: string }) {
  const { timeZone: preferred } = useTimeZone();
  const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : preferred;
  return <>{formatTime(value, zone)}</>;
}
