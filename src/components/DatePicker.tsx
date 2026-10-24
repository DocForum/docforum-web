import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addDays,
  addMonths,
  dateParts,
  firstDayOfWeek,
  formatDateLabel,
  formatMonthLabel,
  formatTypedDateExample,
  isValidIsoDate,
  isoDateFromParts,
  parseDateInput,
  todayInTimeZone,
  weekdayLabels,
} from './date-utils';
import styles from './DateTimePicker.module.css';

export interface DatePickerProps {
  label: string;
  /** Calendar date as `YYYY-MM-DD`, or an empty string. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Extra rule, e.g. weekends or blackout dates. */
  disabledDates?: (date: string) => boolean;
  /** IANA zone used to decide which day "today" is. */
  timeZone?: string;
  locale?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  disabledDates,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale = 'en-GB',
  id,
  name,
  required,
  disabled,
  error,
  hint,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const dialogId = `${inputId}-dialog`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [typedError, setTypedError] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState(value || todayInTimeZone(timeZone));
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const today = todayInTimeZone(timeZone);
  const firstDay = firstDayOfWeek(locale);
  const weekdays = useMemo(() => weekdayLabels(locale, firstDay), [firstDay, locale]);

  const isDisabled = useCallback(
    (date: string) => {
      if (min && date < min) return true;
      if (max && date > max) return true;
      return disabledDates?.(date) ?? false;
    },
    [disabledDates, max, min],
  );

  // A 6-week grid keeps the dialog height stable while paging months.
  const gridDays = useMemo(() => {
    const { year, month } = dateParts(focusedDate);
    const firstOfMonth = isoDateFromParts(year, month, 1);
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const offset = (firstWeekday - firstDay + 7) % 7;
    const start = addDays(firstOfMonth, -offset);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [firstDay, focusedDate]);

  const monthLabel = formatMonthLabel(focusedDate, locale);
  const selected = isValidIsoDate(value) ? value : '';

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedDate}"]`);
    button?.focus();
  }, [focusedDate, open]);

  useEffect(() => {
    if (!open) return;
    const handle = (event: MouseEvent) => {
      const dialog = document.getElementById(dialogId);
      if (dialog && !dialog.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [close, dialogId, open]);

  const commitTyped = () => {
    const parsed = parseDateInput(draft, locale);
    if (parsed === null) {
      setTypedError(`Enter a date like ${formatTypedDateExample(locale)}.`);
      return;
    }
    setTypedError(null);
    if (parsed !== value) onChange(parsed);
  };

  const openDialog = () => {
    setFocusedDate(selected || today);
    setOpen(true);
  };

  const selectDate = (date: string) => {
    if (isDisabled(date)) return;
    onChange(date);
    setTypedError(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const moveFocus = (target: string, direction: number) => {
    let next = target;
    // Skip disabled days in the direction of travel rather than trapping
    // keyboard focus on a button that cannot be selected.
    for (let guard = 0; guard < 400 && isDisabled(next); guard += 1) {
      next = addDays(next, direction);
    }
    setFocusedDate(next);
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let target: string | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(focusedDate, -1);
        break;
      case 'ArrowRight':
        target = addDays(focusedDate, 1);
        break;
      case 'ArrowUp':
        target = addDays(focusedDate, -7);
        break;
      case 'ArrowDown':
        target = addDays(focusedDate, 7);
        break;
      case 'PageUp':
        target = addMonths(focusedDate, -1);
        break;
      case 'PageDown':
        target = addMonths(focusedDate, 1);
        break;
      case 'Home': {
        const { year, month } = dateParts(focusedDate);
        target = isoDateFromParts(year, month, 1);
        break;
      }
      case 'End': {
        const { year, month } = dateParts(focusedDate);
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        target = isoDateFromParts(year, month, lastDay);
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isDisabled(focusedDate)) selectDate(focusedDate);
        return;
      case 'Escape':
        event.preventDefault();
        close();
        return;
      default:
        return;
    }
    event.preventDefault();
    const backwards =
      event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'Home';
    moveFocus(target, backwards ? -1 : 1);
  };

  // Keep Tab inside the modal while it is open.
  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const describedBy = [hint ? hintId : null, error || typedError ? errorId : null].filter(Boolean).join(' ');
  const displayError = error ?? typedError;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          className={styles.input}
          value={draft}
          placeholder={formatTypedDateExample(locale)}
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            setTypedError(null);
            const parsed = parseDateInput(next, locale);
            if (parsed !== null && parsed !== value) onChange(parsed);
          }}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitTyped();
            }
            if (event.key === 'ArrowDown' && event.altKey) {
              event.preventDefault();
              openDialog();
            }
          }}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(displayError)}
          aria-describedby={describedBy || undefined}
          autoComplete="off"
        />
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          onClick={() => (open ? close() : openDialog())}
          aria-label="Open calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
            <rect x="3.5" y="5.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {displayError && (
        <p id={errorId} className={styles.error} role="alert">
          {displayError}
        </p>
      )}
      <p className={styles.hint} aria-live="polite">
        {selected ? `${formatDateLabel(selected, locale)} · ${timeZone}` : `Dates use ${timeZone}`}
      </p>

      {open &&
        createPortal(
          <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && close()}>
            <div
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${dialogId}-title`}
              className={styles.dialog}
              onKeyDown={(event) => {
                handleDialogKeyDown(event);
                if (event.key === 'Escape') {
                  event.preventDefault();
                  close();
                }
              }}
            >
              <div className={styles.dialogHeader}>
                <button
                  type="button"
                  className={styles.navButton}
                  onClick={() => setFocusedDate(addMonths(focusedDate, -1))}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                <h2 id={`${dialogId}-title`} className={styles.month} aria-live="polite">
                  {monthLabel}
                </h2>
                <button
                  type="button"
                  className={styles.navButton}
                  onClick={() => setFocusedDate(addMonths(focusedDate, 1))}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>

              <div className={styles.gridWrap} onKeyDown={handleGridKeyDown} ref={gridRef}>
                <table role="grid" className={styles.grid} aria-label={monthLabel}>
                  <thead>
                    <tr role="row">
                      {weekdays.map((day) => (
                        <th key={day.long} role="columnheader" scope="col" className={styles.weekday}>
                          <abbr title={day.long}>{day.narrow}</abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 6 }, (_, row) => (
                      <tr role="row" key={row}>
                        {gridDays.slice(row * 7, row * 7 + 7).map((date) => {
                          const outside = dateParts(date).month !== dateParts(focusedDate).month;
                          const disabledDay = isDisabled(date);
                          return (
                            <td
                              key={date}
                              role="gridcell"
                              aria-selected={date === selected}
                              className={styles.cell}
                            >
                              <button
                                type="button"
                                data-date={date}
                                className={`${styles.day} ${date === selected ? styles.selectedDay : ''} ${
                                  outside ? styles.outside : ''
                                } ${date === today ? styles.today : ''}`}
                                tabIndex={date === focusedDate ? 0 : -1}
                                disabled={disabledDay}
                                aria-current={date === today ? 'date' : undefined}
                                aria-label={formatDateLabel(date, locale)}
                                onClick={() => selectDate(date)}
                                onFocus={() => setFocusedDate(date)}
                              >
                                {dateParts(date).day}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.dialogFooter}>
                <button type="button" className={styles.textButton} onClick={() => selectDate(today)} disabled={isDisabled(today)}>
                  Today
                </button>
                <button type="button" className={styles.textButton} onClick={close}>
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
