import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { DatePicker } from '../../../components/DatePicker';
import { FormError } from '../../../components/FormError';
import { useGenerateSlots } from '../hooks/useSlotManagement';
import { useT, type Translate } from '../../../i18n/useT';
import { ApiError } from '../../../services/api-client';
import {
  MAX_GENERATE_DAYS,
  MINUTES_PER_HOUR,
  addDays,
  daysBetween,
  formatMinutesAsClock,
  isValidIsoDate,
  todayInZone,
} from '../calendar';
import type { IsoDate } from '../calendar';
import type { GenerateSlotsOutcome } from '../hooks/useSlotManagement';
import styles from './GenerateSlotsForm.module.css';

const SLOT_LENGTHS = [15, 20, 30, 45, 60] as const;

interface Props {
  doctorProfileId: string | null;
  timeZone: string;
  /** Injectable clock: the default window is anchored on "today in the doctor's
   * zone", not on the machine's local date. */
  now?: Date;
}

interface FieldErrors {
  fromDate?: string;
  toDate?: string;
  hours?: string;
  slotLength?: string;
}

function validate(
  values: {
    fromDate: string;
    toDate: string;
    startHour: number;
    endHour: number;
    slotLengthMinutes: number;
  },
  t: Translate,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!isValidIsoDate(values.fromDate)) {
    errors.fromDate = t('availability.generate.fromRequired', 'Choose the first date to generate for.');
  }
  if (!isValidIsoDate(values.toDate)) {
    errors.toDate = t('availability.generate.toRequired', 'Choose the last date to generate for.');
  }

  if (!errors.fromDate && !errors.toDate) {
    const span = daysBetween(values.fromDate, values.toDate) + 1;
    if (span < 1) {
      errors.toDate = t('availability.generate.toBeforeFrom', 'The last date cannot be before the first date.');
    }
    // One request per day, so a long range is a long chain of round trips.
    else if (span > MAX_GENERATE_DAYS) {
      errors.toDate = t(
        'availability.generate.rangeTooLong',
        'Keep the range to {max} days or fewer — every day is its own request.',
        { max: MAX_GENERATE_DAYS },
      );
    }
  }

  if (values.endHour <= values.startHour) {
    errors.hours = t(
      'availability.generate.hoursOrder',
      'The end of the daily window must be later than its start.',
    );
  } else {
    const windowMinutes = (values.endHour - values.startHour) * MINUTES_PER_HOUR;
    if (windowMinutes % values.slotLengthMinutes !== 0) {
      errors.slotLength = t(
        'availability.generate.slotLengthMismatch',
        '{minutes} minutes does not divide evenly into a {hours}-hour window. Use 15, 20, 30 or 60.',
        { minutes: values.slotLengthMinutes, hours: values.endHour - values.startHour },
      );
    }
  }

  return errors;
}

export function GenerateSlotsForm({ doctorProfileId, timeZone, now = new Date() }: Props) {
  const t = useT();
  const generate = useGenerateSlots(doctorProfileId, t);
  const today = useMemo(() => todayInZone(now, timeZone), [now, timeZone]);

  const [fromDate, setFromDate] = useState<IsoDate>(today);
  const [toDate, setToDate] = useState<IsoDate>(() => addDays(today, 4));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(13);
  const [slotLength, setSlotLength] = useState<number>(30);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [outcome, setOutcome] = useState<GenerateSlotsOutcome | null>(null);

  const dayCount =
    isValidIsoDate(fromDate) && isValidIsoDate(toDate) ? Math.max(0, daysBetween(fromDate, toDate) + 1) : 0;
  const hours = Array.from({ length: 24 }, (_, index) => index);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validate({ fromDate, toDate, startHour, endHour, slotLengthMinutes: slotLength }, t);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setOutcome(null);
    generate.mutate(
      { fromDate, toDate, startHour, endHour, slotLengthMinutes: slotLength, timeZone },
      { onSuccess: setOutcome },
    );
  }

  const mutationMessage = generate.error
    ? generate.error instanceof ApiError
      ? generate.error.message
      : t('availability.generate.failed', 'The slots could not be generated.')
    : null;

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-label={t('availability.generate.title', 'Generate slots')}
    >
      <h3 className={styles.title}>{t('availability.generate.title', 'Generate slots')}</h3>
      <p className={styles.hint}>
        {t(
          'availability.generate.hint',
          'Every day in the range is a separate request — {max} days maximum. Times are in {timeZone}.',
          { max: MAX_GENERATE_DAYS, timeZone },
        )}
      </p>

      <div className={styles.grid}>
        <DatePicker
          label={t('availability.generate.from', 'From')}
          value={fromDate}
          error={fieldErrors.fromDate}
          onChange={setFromDate}
          timeZone={timeZone}
          required
        />
        <DatePicker
          label={t('availability.generate.to', 'To')}
          value={toDate}
          error={fieldErrors.toDate}
          onChange={setToDate}
          timeZone={timeZone}
          required
        />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="generate-start-hour">
            {t('availability.generate.windowStarts', 'Daily window starts')}
          </label>
          <select
            id="generate-start-hour"
            className={styles.select}
            value={startHour}
            onChange={(event) => setStartHour(Number(event.target.value))}
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {formatMinutesAsClock(hour * MINUTES_PER_HOUR)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="generate-end-hour">
            {t('availability.generate.windowEnds', 'Daily window ends')}
          </label>
          <select
            id="generate-end-hour"
            className={styles.select}
            value={endHour}
            aria-invalid={Boolean(fieldErrors.hours)}
            onChange={(event) => setEndHour(Number(event.target.value))}
          >
            {hours.map((hour) => (
              <option key={hour} value={hour}>
                {formatMinutesAsClock(hour * MINUTES_PER_HOUR)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="generate-slot-length">
            {t('availability.generate.slotLength', 'Slot length')}
          </label>
          <select
            id="generate-slot-length"
            className={styles.select}
            value={slotLength}
            aria-invalid={Boolean(fieldErrors.slotLength)}
            onChange={(event) => setSlotLength(Number(event.target.value))}
          >
            {SLOT_LENGTHS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('availability.generate.minutes', '{count, plural, one {# minute} other {# minutes}}', {
                  count: minutes,
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormError message={fieldErrors.hours ?? null} />
      <FormError message={fieldErrors.slotLength ?? null} />

      <p className={styles.count}>
        {dayCount > 0
          ? t(
              'availability.generate.requestCount',
              'Sends {count, plural, one {# request} other {# requests}} — one per day. Overlapping times are skipped, not duplicated.',
              { count: dayCount },
            )
          : t('availability.generate.pickRange', 'Pick a range of dates to see how many requests this will send.')}
      </p>

      <FormError message={mutationMessage} />

      {outcome && (
        <p className={styles.result} role="status">
          {outcome.failedDays.length > 0
            ? t(
                'availability.generate.outcomePartial',
                'Generated on {ok} of {requested} days — {failed, plural, one {# day failed} other {# days failed}}: {message}',
                {
                  ok: outcome.requestedDays - outcome.failedDays.length,
                  requested: outcome.requestedDays,
                  failed: outcome.failedDays.length,
                  message: outcome.failedDays[0].message,
                },
              )
            : outcome.created > 0
              ? t(
                  'availability.generate.outcomeCreated',
                  'Created {created, plural, one {# slot} other {# slots}}{hasSkipped, select, yes {, skipped {skipped} already covered} other {}}.',
                  { created: outcome.created, skipped: outcome.skipped, hasSkipped: outcome.skipped > 0 ? 'yes' : 'no' },
                )
              : t(
                  'availability.generate.outcomeNone',
                  'No new slots were created — those times were already covered.',
                )}
        </p>
      )}

      <Button type="submit" loading={generate.isPending} disabled={!doctorProfileId}>
        {t('availability.generate.title', 'Generate slots')}
      </Button>
    </form>
  );
}
