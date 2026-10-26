import { formatRelative, formatTimestamp } from '../status';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';

export function TimeAgo({ iso, now }: { iso: string; now: number }) {
  const { timeZone } = useTimeZone();
  return (
    <time dateTime={iso} title={formatTimestamp(iso, timeZone)}>
      {formatRelative(iso, now)}
    </time>
  );
}
