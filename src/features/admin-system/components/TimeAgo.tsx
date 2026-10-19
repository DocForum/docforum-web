import { formatRelative, formatTimestamp } from '../status';

export function TimeAgo({ iso, now }: { iso: string; now: number }) {
  return (
    <time dateTime={iso} title={formatTimestamp(iso)}>
      {formatRelative(iso, now)}
    </time>
  );
}
