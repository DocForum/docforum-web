import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useOptionalT } from '../i18n/useOptionalT';
import { useTimeZone } from '../i18n/TimeZoneProvider';
import {
  addDays,
  addMonths,
  clampDate,
  datePatternHint,
  endOfWeek,
  formatInputDate,
  formatLongDate,
  formatMonthYear,
  monthGrid,
  parseIsoDate,
  parseTypedDate,
  startOfWeek,
  todayIn,
  weekdayNames,
  weekStartFor,
} from '../utils/date-input';
import styles from './DatePicker.module.css';

export interface DatePickerProps {
  label: string;
  /** ISO `YYYY-MM-DD`, or '' for no date — the same value a native
   * `<input type="date">` produces, so it drops into existing forms. */
  value: string;
  onChange: (value: string) => void;
  /** Earliest / latest selectable day, ISO. */
  min?: string;
  max?: string;
  /** Extra unavailable days (closures, fully booked days). */
  isDateDisabled?: (iso: string) => boolean;
  /** Zone that defines "today" (highlighted in the calendar). Defaults to
   * the user's chosen zone from TimeZoneProvider, not the device's. */
  timeZone?: string;
  hint?: string;
  /** Error from the form (e.g. server validation); shown under the field. */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  /** Visually hide the label (it is still the accessible name). */
  hideLabel?: boolean;
}

/**
 * Accessible date picker (issue #114), following the WAI-ARIA APG "Date
 * Picker Dialog" pattern:
 *
 * - A text field that accepts typed dates (the locale's numeric order or
 *   ISO), validated on blur, with the expected format as a hint.
 * - A "Choose date" button opening a modal dialog with a month grid.
 *   Focus moves to the selected (or today's) date and is trapped in the
 *   dialog; Escape or Close returns it to the button.
 * - Grid keys: ←/→ day, ↑/↓ week, Home/End week start/end, PageUp/PageDown
 *   month, Shift+PageUp/PageDown year, Enter/Space select.
 * - The month heading is a polite live region, so paging announces the new
 *   month; each day cell's name is the full date, plus "unavailable".
 * - min/max and `isDateDisabled` days can be focused (so the grid stays
 *   navigable) but not selected — `aria-disabled`.
 * - Touch: every control and day cell meets the 44px target size.
 */
export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  isDateDisabled,
  timeZone: zoneProp,
  hint,
  error,
  required,
  disabled,
  id,
  name,
  hideLabel,
}: DatePickerProps) {
  const { t, locale } = useOptionalT();
  const { timeZone: userZone } = useTimeZone();
  const timeZone = zoneProp ?? userZone;
  const generatedId = useId();
  const inputId = id ?? `date-${generatedId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const dialogId = `${inputId}-dialog`;
  const headingId = `${inputId}-heading`;
  const keysHintId = `${inputId}-keys`;

  const [text, setText] = useState(() => formatInputDate(value, locale));
  const [typedError, setTypedError] = useState<string | null>(null);
  const lastEmitted = useRef(value);

  // Keep the visible text in step with a value changed from outside (form
  // reset, preset buttons) — but never clobber what the user is typing.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setText(formatInputDate(value, locale));
    setTypedError(null);
  }, [value, locale]);

  const emit = useCallback(
    (next: string) => {
      lastEmitted.current = next;
      if (next !== value) onChange(next);
    },
    [onChange, value],
  );

  const unavailable = useCallback(
    (iso: string) => Boolean((min && iso < min) || (max && iso > max) || isDateDisabled?.(iso)),
    [min, max, isDateDisabled],
  );

  const pattern = datePatternHint(locale);
  const describe = (iso: string) => formatLongDate(iso, locale);

  const validate = (raw: string): { iso: string; problem: string | null } => {
    if (!raw.trim()) {
      return {
        iso: '',
        problem: required ? t('datePicker.required', 'Enter a date.') : null,
      };
    }
    const iso = parseTypedDate(raw, locale);
    if (!iso) {
      return {
        iso: '',
        problem: t('datePicker.invalid', 'Enter a real date in the format {pattern}.', { pattern }),
      };
    }
    if (min && iso < min) {
      return { iso: '', problem: t('datePicker.beforeMin', 'Choose {date} or later.', { date: describe(min) }) };
    }
    if (max && iso > max) {
      return { iso: '', problem: t('datePicker.afterMax', 'Choose {date} or earlier.', { date: describe(max) }) };
    }
    if (isDateDisabled?.(iso)) {
      return { iso: '', problem: t('datePicker.unavailable', '{date} is not available.', { date: describe(iso) }) };
    }
    return { iso, problem: null };
  };

  const onTextChange = (raw: string) => {
    setText(raw);
    // Mirror the native input: any real date is reported as it is typed —
    // even one outside min/max, which (like native constraint validation)
    // is flagged on blur and left for the form to reject with its own
    // message. Unparseable text reports '' (no date). Errors wait for blur.
    const parsed = parseTypedDate(raw, locale);
    emit(parsed ?? '');
    if (!validate(raw).problem) setTypedError(null);
  };

  const onTextBlur = () => {
    const { iso, problem } = validate(text);
    setTypedError(problem);
    if (!problem && iso) setText(formatInputDate(iso, locale));
  };

  // ── Dialog ────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const today = todayIn(timeZone);
  const [focused, setFocused] = useState(() => clampDate(parseIsoDate(value) ? value : today, min, max));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const moveFocusToGrid = useRef(false);

  const openDialog = () => {
    const parsed = parseTypedDate(text, locale);
    setFocused(clampDate(parsed ?? (parseIsoDate(value) ? value : today), min, max));
    moveFocusToGrid.current = true;
    setOpen(true);
  };

  const closeDialog = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  const select = (iso: string) => {
    if (unavailable(iso)) return;
    setText(formatInputDate(iso, locale));
    setTypedError(null);
    emit(iso);
    closeDialog();
  };

  // Focus follows the roving tabindex cell whenever it changes while open.
  useLayoutEffect(() => {
    if (!open) return;
    const cell = gridRef.current?.querySelector<HTMLElement>(`[data-date="${focused}"]`);
    if (moveFocusToGrid.current || gridRef.current?.contains(document.activeElement)) {
      cell?.focus();
      moveFocusToGrid.current = false;
    }
  }, [open, focused]);

  // Close on a pointer press outside the dialog (non-modal escape hatch for
  // mouse/touch users; keyboard users have Escape and the Close button).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (dialogRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const weekStart = weekStartFor(locale);
  const visible = parseIsoDate(focused)!;
  const weeks = useMemo(() => monthGrid(visible.year, visible.month, weekStart), [visible.year, visible.month, weekStart]);
  const weekdays = useMemo(() => weekdayNames(locale, weekStart), [locale, weekStart]);

  const moveTo = (iso: string) => setFocused(clampDate(iso, min, max));

  const onGridKeyDown = (event: KeyboardEvent<HTMLTableElement>) => {
    const keyMoves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => startOfWeek(focused, weekStart),
      End: () => endOfWeek(focused, weekStart),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    };
    const move = keyMoves[event.key];
    if (move) {
      event.preventDefault();
      // Paging to another month re-renders the grid and drops the focused
      // cell, so ask the layout effect to focus the new one explicitly.
      moveFocusToGrid.current = true;
      moveTo(move());
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(focused);
    }
  };

  // Escape anywhere in the dialog, and Tab wrapping inside it (modal).
  const onDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusables = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"]'),
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const shownError = error ?? typedError ?? undefined;
  const describedBy = [hintId, shownError ? errorId : null].filter(Boolean).join(' ');
  const selectedLabel = parseIsoDate(value) ? describe(value) : null;
  const prevMonthDisabled = Boolean(min && addMonths(focused, -1).slice(0, 7) < min.slice(0, 7));
  const nextMonthDisabled = Boolean(max && addMonths(focused, 1).slice(0, 7) > max.slice(0, 7));
  const prevYearDisabled = Boolean(min && addMonths(focused, -12).slice(0, 7) < min.slice(0, 7));
  const nextYearDisabled = Boolean(max && addMonths(focused, 12).slice(0, 7) > max.slice(0, 7));

  return (
    <div className={styles.field}>
      <label id={`${inputId}-label`} htmlFor={inputId} className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={inputId}
          name={name}
          className={styles.input}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={pattern}
          value={text}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(shownError)}
          aria-describedby={describedBy}
          onChange={(event) => onTextChange(event.target.value)}
          onBlur={onTextBlur}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && event.altKey) {
              event.preventDefault();
              openDialog();
            }
          }}
        />
        <button
          ref={buttonRef}
          type="button"
          className={styles.trigger}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          // A generic name plus the field label as its description, so two
          // pickers on one form stay distinguishable ("Choose date, From")
          // without the button competing with the input for the label.
          aria-label={
            selectedLabel
              ? t('datePicker.chooseSelected', 'Choose date, selected {date}', { date: selectedLabel })
              : t('datePicker.choose', 'Choose date')
          }
          aria-describedby={`${inputId}-label`}
          onClick={() => (open ? closeDialog() : openDialog())}
        >
          <CalendarIcon />
        </button>
      </div>
      <p id={hintId} className={styles.hint}>
        {hint ? `${hint} ` : ''}
        {t('datePicker.formatHint', 'Format: {pattern}.', { pattern })}
      </p>
      {shownError && (
        <p id={errorId} className={styles.error} role="alert">
          {shownError}
        </p>
      )}

      {open && (
        <div
          ref={dialogRef}
          id={dialogId}
          className={styles.dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          onKeyDown={onDialogKeyDown}
        >
          <div className={styles.header}>
            <button
              type="button"
              className={styles.nav}
              disabled={prevYearDisabled}
              aria-label={t('datePicker.previousYear', 'Previous year')}
              onClick={() => moveTo(addMonths(focused, -12))}
            >
              <span aria-hidden="true">«</span>
            </button>
            <button
              type="button"
              className={styles.nav}
              disabled={prevMonthDisabled}
              aria-label={t('datePicker.previousMonth', 'Previous month')}
              onClick={() => moveTo(addMonths(focused, -1))}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <h2 id={headingId} className={styles.heading} aria-live="polite">
              {formatMonthYear(focused, locale)}
            </h2>
            <button
              type="button"
              className={styles.nav}
              disabled={nextMonthDisabled}
              aria-label={t('datePicker.nextMonth', 'Next month')}
              onClick={() => moveTo(addMonths(focused, 1))}
            >
              <span aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className={styles.nav}
              disabled={nextYearDisabled}
              aria-label={t('datePicker.nextYear', 'Next year')}
              onClick={() => moveTo(addMonths(focused, 12))}
            >
              <span aria-hidden="true">»</span>
            </button>
          </div>

          <table
            ref={gridRef}
            className={styles.grid}
            role="grid"
            aria-labelledby={headingId}
            aria-describedby={keysHintId}
            onKeyDown={onGridKeyDown}
          >
            <thead>
              <tr>
                {weekdays.map((weekday) => (
                  <th key={weekday.long} scope="col" abbr={weekday.long}>
                    {weekday.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((iso, dayIndex) => {
                    if (!iso) return <td key={`pad-${dayIndex}`} className={styles.pad} />;
                    const isUnavailable = unavailable(iso);
                    const isSelected = iso === value;
                    const isFocused = iso === focused;
                    return (
                      <td
                        key={iso}
                        role="gridcell"
                        data-date={iso}
                        tabIndex={isFocused ? 0 : -1}
                        aria-selected={isSelected}
                        aria-disabled={isUnavailable || undefined}
                        aria-current={iso === today ? 'date' : undefined}
                        aria-label={
                          isUnavailable
                            ? t('datePicker.dayUnavailable', '{date}, unavailable', { date: describe(iso) })
                            : describe(iso)
                        }
                        className={[
                          styles.day,
                          isSelected ? styles.selected : '',
                          iso === today ? styles.today : '',
                          isUnavailable ? styles.unavailable : '',
                        ].join(' ')}
                        onClick={() => {
                          setFocused(iso);
                          select(iso);
                        }}
                      >
                        {Number(iso.slice(8))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <p id={keysHintId} className={styles.srOnly}>
            {t(
              'datePicker.keysHint',
              'Arrow keys move between days, Page Up and Page Down change month, Enter selects, Escape closes.',
            )}
          </p>
          <div className={styles.footer}>
            <span className={styles.zone}>{t('datePicker.todayIn', 'Today in {zone}', { zone: timeZone })}</span>
            <button type="button" className={styles.close} onClick={closeDialog}>
              {t('datePicker.close', 'Close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}
