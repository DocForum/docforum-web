import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { TextField } from '../../../components/TextField';
import { useGenerateSlots } from '../hooks/useSlotManagement';
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

function validate(values: {
  fromDate: string;
  toDate: string;
  startHour: number;
  endHour: number;
  slotLengthMinutes: number;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!isValidIsoDate(values.fromDate)) errors.fromDate = 'Choose the first date to generate for.';
  if (!isValidIsoDate(values.toDate)) errors.toDate = 'Choose the last date to generate for.';

  if (!errors.fromDate && !errors.toDate) {
    const span = daysBetween(values.fromDate, values.toDate) + 1;
    if (span < 1) errors.toDate = 'The last date cannot be before the first date.';
    // One request per day, so a long range is a long chain of round trips.
    else if (span > MAX_GENERATE_DAYS) errors.toDate = `Keep the range to ${MAX_GENERATE_DAYS} days or fewer — every day is its own request.`;
  }

  if (values.endHour <= values.startHour) {
    errors.hours = 'The end of the daily window must be later than its start.';
  } else {
    const windowMinutes = (values.endHour - values.startHour) * MINUTES_PER_HOUR;
    if (windowMinutes % values.slotLengthMinutes !== 0) {
      errors.slotLength = `${values.slotLengthMinutes} minutes does not divide evenly into a ${values.endHour - values.startHour}-hour window. Use 15, 20, 30 or 60.`;
    }
  }

  return errors;
}

export function GenerateSlotsForm({ doctorProfileId, timeZone, now = new Date() }: Props) {
  const generate = useGenerateSlots(doctorProfileId);
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
    const errors = validate({ fromDate, toDate, startHour, endHour, slotLengthMinutes: slotLength });
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
      : 'The slots could not be generated.'
    : null;

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Generate slots">
      <h3 className={styles.title}>Generate slots</h3>
      <p className={styles.hint}>
        Every day in the range is a separate request — {MAX_GENERATE_DAYS} days maximum. Times are in {timeZone}.
      </p>

      <div className={styles.grid}>
        <TextField
          label="From"
          type="date"
          value={fromDate}
          error={fieldErrors.fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          required
        />
        <TextField
          label="To"
          type="date"
          value={toDate}
          error={fieldErrors.toDate}
          onChange={(event) => setToDate(event.target.value)}
          required
        />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="generate-start-hour">
            Daily window starts
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
            Daily window ends
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
            Slot length
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
                {minutes} minutes
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormError message={fieldErrors.hours ?? null} />
      <FormError message={fieldErrors.slotLength ?? null} />

      <p className={styles.count}>
        {dayCount > 0
          ? `Sends ${dayCount} ${dayCount === 1 ? 'request' : 'requests'} — one per day. Overlapping times are skipped, not duplicated.`
          : 'Pick a range of dates to see how many requests this will send.'}
      </p>

      <FormError message={mutationMessage} />

      {outcome && (
        <p className={styles.result} role="status">
          {outcome.failedDays.length > 0
            ? `Generated on ${outcome.requestedDays - outcome.failedDays.length} of ${outcome.requestedDays} days — ${outcome.failedDays.length} ${outcome.failedDays.length === 1 ? 'day failed' : 'days failed'}: ${outcome.failedDays[0].message}`
            : outcome.created > 0
              ? `Created ${outcome.created} slot${outcome.created === 1 ? '' : 's'}${outcome.skipped > 0 ? `, skipped ${outcome.skipped} already covered` : ''}.`
              : 'No new slots were created — those times were already covered.'}
        </p>
      )}

      <Button type="submit" loading={generate.isPending} disabled={!doctorProfileId}>
        Generate slots
      </Button>
    </form>
  );
}
