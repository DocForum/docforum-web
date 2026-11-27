import { formatRelative, formatTimestamp } from '../status';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { useOptionalT } from '../../../i18n/useOptionalT';

/** Relative time in the active locale: `Intl.RelativeTimeFormat` for the
 * wording, the catalogue only for the sub-minute phrases. */
export function TimeAgo({ iso, now }: { iso: string; now: number }) {
  const { timeZone } = useTimeZone();
  const { locale, t } = useOptionalT();
  return (
    <time dateTime={iso} title={formatTimestamp(iso, timeZone)}>
      {formatRelative(iso, now, locale, t)}
    </time>
  );
}
