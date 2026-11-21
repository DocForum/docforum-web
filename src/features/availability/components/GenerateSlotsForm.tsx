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
  generationDates,
  isValidIsoDate,
  todayInZone,
} from '../calendar';
import type { IsoDate } from '../calendar';
import type { GenerateSlotsOutcome } from '../hooks/useSlotManagement';
import styles from './GenerateSlotsForm.module.css';

const SLOT_LENGTHS = [15, 20, 30, 45, 60] as const;
const WEEKDAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

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
  weekdays?: string;
}

function validate(
  values: {
    fromDate: string;
    toDate: string;
    startHour: number;
    endHour: number;
    slotLengthMinutes: number;
    weekdays: readonly number[];
  },
  t: Translate,
): FieldErrors {
  const errors: FieldErrors = {};

  if (values.weekdays.length === 0) errors.weekdays = t('availability.generate.weekdayRequired', 'Choose at least one weekday.');

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
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [outcome, setOutcome] = useState<GenerateSlotsOutcome | null>(null);

  const dayCount =
    isValidIsoDate(fromDate) && isValidIsoDate(toDate) && toDate >= fromDate
      ? generationDates(fromDate, toDate, weekdays, today).length : 0;
  const hours = Array.from({ length: 24 }, (_, index) => index);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validate({ fromDate, toDate, startHour, endHour, slotLengthMinutes: slotLength, weekdays }, t);
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setOutcome(null);
    generate.mutate(
      { fromDate, toDate, startHour, endHour, slotLengthMinutes: slotLength, timeZone, weekdays, today },
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

      <fieldset className={styles.weekdays} aria-describedby={fieldErrors.weekdays ? 'generate-weekday-error' : undefined}>
        <legend className={styles.label}>{t('availability.generate.weekdays', 'Weekdays')}</legend>
        {WEEKDAYS.map((day) => (
          <label key={day.value} className={styles.weekday}>
            <input type="checkbox" checked={weekdays.includes(day.value)} onChange={(event) => {
              setWeekdays((current) => event.target.checked
                ? [...current, day.value]
                : current.filter((value) => value !== day.value));
            }} />
            {day.label}
          </label>
        ))}
      </fieldset>
      {fieldErrors.weekdays && <div id="generate-weekday-error"><FormError message={fieldErrors.weekdays} /></div>}

      <FormError message={fieldErrors.hours ?? null} />
      <FormError message={fieldErrors.slotLength ?? null} />

      <p className={styles.count}>
        {dayCount > 0
          ? t(
              'availability.generate.requestCount',
              'Sends {count, plural, one {# request} other {# requests}} — one per selected future day. Overlapping times are skipped, not duplicated.',
              { count: dayCount },
            )
          : t('availability.generate.pickRange', 'Pick a range of dates to see how many requests this will send.')}
      </p>

      <FormError message={mutationMessage} />

      {generate.isPending && (
        <p role="status" aria-live="polite">
          {t('availability.generate.progress', 'Processed {done} of {total} days.', {
            done: generate.progress.completed, total: generate.progress.total,
          })}
        </p>
      )}

      {outcome && (
        <p className={styles.result} role="status">
          {outcome.cancelled
            ? t('availability.generate.cancelled', 'Stopped after {done} of {total} selected days. Created {created} slots; {skipped} were already covered.', {
                done: generate.progress.completed, total: outcome.requestedDays,
                created: outcome.created, skipped: outcome.skipped,
              })
            : outcome.failedDays.length > 0
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
      {generate.isPending && <Button type="button" variant="secondary" onClick={generate.cancel}>{t('availability.generate.cancel', 'Cancel generation')}</Button>}
      <p className={styles.hint}>{t('availability.generate.retry', 'You can retry the whole range after a failure; already covered times are skipped.')}</p>
    </form>
  );
}
