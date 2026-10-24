import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  formatTimeLabel,
  minutesFromTime,
  parseTimeInput,
  timeFromMinutes,
} from './date-utils';
import styles from './DateTimePicker.module.css';

export interface TimePickerProps {
  label: string;
  /** 24-hour `HH:mm`, or an empty string. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Granularity of the suggestion list; typing still accepts any minute. */
  stepMinutes?: number;
  /** IANA zone the time is interpreted in (shown to the user). */
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

export function TimePicker({
  label,
  value,
  onChange,
  min = '00:00',
  max = '23:59',
  stepMinutes = 30,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale = 'en-GB',
  id,
  name,
  required,
  disabled,
  error,
  hint,
}: TimePickerProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const dialogId = `${inputId}-dialog`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [typedError, setTypedError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const options = useMemo(() => {
    const step = Math.max(1, Math.min(60, Math.round(stepMinutes)));
    const start = minutesFromTime(min);
    const end = minutesFromTime(max);
    const times: string[] = [];
    for (let minute = 0; minute < 24 * 60; minute += step) {
      if (minute >= start && minute <= end) times.push(timeFromMinutes(minute));
    }
    // A typed time that isn't on the step grid still needs an option.
    if (value && minutesFromTime(value) >= start && minutesFromTime(value) <= end && !times.includes(value)) {
      times.push(value);
      times.sort((a, b) => minutesFromTime(a) - minutesFromTime(b));
    }
    return times;
  }, [max, min, stepMinutes, value]);

  const selectedIndex = Math.max(0, options.indexOf(value));
  const selectedLabel = value ? formatTimeLabel(value, locale) : '';

  const close = useCallback(() => {
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    setFocusedIndex(selectedIndex);
    // Wait for the dialog to paint before moving focus into the list.
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>('[role="option"][tabindex="0"]')?.focus();
    });
    return () => cancelAnimationFrame(frame);
    // Only on open; arrow keys update the index themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = listRef.current?.querySelector<HTMLElement>(`[data-index="${focusedIndex}"]`);
    option?.focus();
  }, [focusedIndex, open]);

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
    const parsed = parseTimeInput(draft);
    if (parsed === null) {
      setTypedError('Enter a time like 09:30 or 9:30 PM.');
      return;
    }
    setTypedError(null);
    if (parsed !== value) onChange(parsed);
  };

  const choose = (time: string) => {
    onChange(time);
    setTypedError(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    let next = focusedIndex;
    switch (event.key) {
      case 'ArrowDown':
        next = Math.min(options.length - 1, focusedIndex + 1);
        break;
      case 'ArrowUp':
        next = Math.max(0, focusedIndex - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      case 'PageDown':
        next = Math.min(options.length - 1, focusedIndex + 6);
        break;
      case 'PageUp':
        next = Math.max(0, focusedIndex - 6);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (options[focusedIndex]) choose(options[focusedIndex]);
        return;
      case 'Escape':
        event.preventDefault();
        close();
        return;
      default:
        return;
    }
    event.preventDefault();
    setFocusedIndex(next);
  };

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
  const minLabel = formatTimeLabel(min, locale);
  const maxLabel = formatTimeLabel(max, locale);

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
          placeholder="HH:MM"
          onChange={(event) => {
            const next = event.target.value;
            setDraft(next);
            setTypedError(null);
            const parsed = parseTimeInput(next);
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
              setOpen(true);
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
          onClick={() => (open ? close() : setOpen(true))}
          aria-label="Open time options"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
        {selectedLabel ? `${selectedLabel} · ${timeZone}` : `Times use ${timeZone}`}
      </p>

      {open &&
        createPortal(
          <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && close()}>
            <div
              id={dialogId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${dialogId}-title`}
              className={`${styles.dialog} ${styles.timeDialog}`}
              onKeyDown={(event) => {
                handleDialogKeyDown(event);
                if (event.key === 'Escape') {
                  event.preventDefault();
                  close();
                }
              }}
            >
              <div className={styles.dialogHeader}>
                <h2 id={`${dialogId}-title`} className={styles.month}>
                  {label}
                </h2>
              </div>
              <p className={styles.listHint}>
                {minLabel} – {maxLabel}, every {Math.max(1, Math.min(60, Math.round(stepMinutes)))} minutes
              </p>
              <ul
                ref={listRef}
                role="listbox"
                aria-label={`${label} options`}
                className={styles.timeList}
                onKeyDown={handleListKeyDown}
              >
                {options.map((time, index) => (
                  <li
                    key={time}
                    role="option"
                    data-index={index}
                    aria-selected={time === value}
                    tabIndex={index === focusedIndex ? 0 : -1}
                    className={`${styles.timeOption} ${time === value ? styles.selectedDay : ''}`}
                    onClick={() => choose(time)}
                    onFocus={() => setFocusedIndex(index)}
                  >
                    {formatTimeLabel(time, locale)}
                  </li>
                ))}
              </ul>
              <div className={styles.dialogFooter}>
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
