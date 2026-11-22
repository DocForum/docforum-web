import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useOptionalT } from '../i18n/useOptionalT';
import { useTimeZone } from '../i18n/TimeZoneProvider';
import {
  formatTime,
  parseTypedTime,
  timeOptions,
  timeToMinutes,
  timeZoneLabel,
} from '../utils/date-input';
import styles from './DatePicker.module.css';

export interface TimePickerProps {
  label: string;
  /** 24-hour `HH:mm`, or '' — the same value `<input type="time">` gives. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Minutes between suggested times in the list. Typed times need not
   * fall on a step. Default 15. */
  step?: number;
  /** The zone this wall-clock time is in, shown in the hint. Defaults to
   * the user's chosen zone. The value itself is never converted. */
  timeZone?: string;
  /** Hide the zone hint, e.g. when the form already states the zone once. */
  hideTimeZone?: boolean;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  hideLabel?: boolean;
}

/**
 * Accessible time picker (issue #114): a WAI-ARIA 1.2 combobox. Typing is
 * first-class — `14:30`, `2:30 pm`, `1430`, `9` all work — and a listbox of
 * suggestions at `step` intervals filters as you type. DOM focus stays in
 * the input; the active option is conveyed with `aria-activedescendant`.
 *
 * Keys: ↓/↑ open and move, Alt+↓ open, Enter pick, Escape close (a second
 * Escape clears nothing — it never discards typed text).
 */
export function TimePicker({
  label,
  value,
  onChange,
  min,
  max,
  step = 15,
  timeZone: zoneProp,
  hideTimeZone,
  hint,
  error,
  required,
  disabled,
  id,
  name,
  hideLabel,
}: TimePickerProps) {
  const { t, locale } = useOptionalT();
  const { timeZone: userZone } = useTimeZone();
  const timeZone = zoneProp ?? userZone;
  const generatedId = useId();
  const inputId = id ?? `time-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const [text, setText] = useState(() => formatTime(value, locale));
  const [typedError, setTypedError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const lastEmitted = useRef(value);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setText(formatTime(value, locale));
    setTypedError(null);
  }, [value, locale]);

  const emit = (next: string) => {
    lastEmitted.current = next;
    if (next !== value) onChange(next);
  };

  const allOptions = useMemo(() => timeOptions(step, min, max), [step, min, max]);
  const options = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (!query || query === formatTime(value, locale).toLowerCase()) return allOptions;
    const typed = parseTypedTime(query);
    const matches = allOptions.filter(
      (option) => formatTime(option, locale).toLowerCase().startsWith(query) || option.startsWith(query),
    );
    if (matches.length > 0) return matches;
    // No prefix match: show the suggestions nearest the typed time.
    if (typed) {
      const target = timeToMinutes(typed);
      return [...allOptions]
        .sort((a, b) => Math.abs(timeToMinutes(a) - target) - Math.abs(timeToMinutes(b) - target))
        .slice(0, 6)
        .sort();
    }
    return [];
  }, [allOptions, text, value, locale]);

  const outOfRange = (time: string) =>
    Boolean((min && timeToMinutes(time) < timeToMinutes(min)) || (max && timeToMinutes(time) > timeToMinutes(max)));

  const validate = (raw: string): { time: string; problem: string | null } => {
    if (!raw.trim()) return { time: '', problem: required ? t('timePicker.required', 'Enter a time.') : null };
    const time = parseTypedTime(raw);
    if (!time) return { time: '', problem: t('timePicker.invalid', 'Enter a time like 14:30 or 2:30 pm.') };
    if (outOfRange(time)) {
      return {
        time: '',
        problem: t('timePicker.outOfRange', 'Choose a time between {min} and {max}.', {
          min: formatTime(min ?? '00:00', locale),
          max: formatTime(max ?? '23:59', locale),
        }),
      };
    }
    return { time, problem: null };
  };

  const pick = (time: string) => {
    setText(formatTime(time, locale));
    setTypedError(null);
    emit(time);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        const current = options.indexOf(value);
        setActive(current >= 0 ? current : 0);
        return;
      }
      if (event.altKey) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => Math.min(options.length - 1, Math.max(0, index + delta)));
      return;
    }
    if (event.key === 'Enter' && open && active >= 0 && options[active]) {
      event.preventDefault();
      pick(options[active]);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    }
  };

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || active < 0) return;
    const option = listRef.current?.children[active] as HTMLElement | undefined;
    option?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const shownError = error ?? typedError ?? undefined;
  const zoneHint = hideTimeZone ? '' : t('timePicker.zoneHint', 'Times in {zone}.', { zone: timeZoneLabel(timeZone, locale) });
  const hintText = [hint, zoneHint].filter(Boolean).join(' ');
  const describedBy = [hintText ? hintId : null, shownError ? errorId : null].filter(Boolean).join(' ') || undefined;
  const activeId = open && active >= 0 && options[active] ? `${listboxId}-${options[active].replace(':', '')}` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={`${styles.input} ${styles.standalone}`}
        type="text"
        role="combobox"
        autoComplete="off"
        inputMode="text"
        placeholder={formatTime('14:30', locale)}
        value={text}
        required={required}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-invalid={Boolean(shownError)}
        aria-describedby={describedBy}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          setOpen(true);
          setActive(-1);
          // Like the native input: any real time is reported, even one
          // outside min/max (flagged on blur, rejected by the form).
          emit(parseTypedTime(raw) ?? '');
          if (!validate(raw).problem) setTypedError(null);
        }}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          const { time, problem } = validate(text);
          setTypedError(problem);
          if (!problem && time) setText(formatTime(time, locale));
        }}
        onKeyDown={onKeyDown}
      />
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={label}
        className={styles.listbox}
        hidden={!open || options.length === 0}
      >
        {open && options.map((option, index) => (
          <li
            key={option}
            id={`${listboxId}-${option.replace(':', '')}`}
            role="option"
            aria-selected={option === value}
            className={`${styles.option} ${index === active ? styles.optionActive : ''}`}
            // mousedown, not click: keeps focus in the input (no blur first).
            onMouseDown={(event) => {
              event.preventDefault();
              pick(option);
            }}
          >
            {formatTime(option, locale)}
          </li>
        ))}
      </ul>
      {hintText && (
        <p id={hintId} className={styles.hint}>
          {hintText}
        </p>
      )}
      {shownError && (
        <p id={errorId} className={styles.error} role="alert">
          {shownError}
        </p>
      )}
    </div>
  );
}

