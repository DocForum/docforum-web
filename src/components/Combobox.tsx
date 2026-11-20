import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './Combobox.module.css';

// Accessible combobox with a listbox popup, following the WAI-ARIA 1.2
// combobox pattern: the input keeps DOM focus at all times, the highlighted
// option is communicated with aria-activedescendant (never by moving
// focus), and a polite live region announces suggestion counts and the
// active option as the patient arrows through the list.
//
// Deliberately uncontrolled in spirit: it renders whatever text and options
// the parent supplies and reports intent (typing, picking, clearing) back
// up. Debouncing, fetching and state live in the parent, so this component
// stays pure presentation + interaction and is easy to test on its own.

export interface ComboboxOption {
  /** Stable id — becomes the DOM id of its option element. */
  id: string;
  label: string;
  /** Optional secondary line, e.g. which specialty a symptom maps to. */
  hint?: string;
}

interface ComboboxProps {
  /** Stable base id — the input gets `${id}-input`, the listbox `${id}-listbox`. */
  id: string;
  label: string;
  /** The committed selection's option id, or '' when nothing is selected. */
  selectedOptionId: string;
  /** The text currently shown in the input (controlled). */
  inputValue: string;
  onInputChange: (value: string) => void;
  /** Fired when the user picks an option, or clears the selection with null. */
  onSelect: (optionId: string | null) => void;
  options: ComboboxOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Shown inside the popup when the user has typed but nothing matched. */
  emptyMessage?: string;
  /** Helper text under the input. */
  helpText?: string;
}

export function Combobox({
  id,
  label,
  selectedOptionId,
  inputValue,
  onInputChange,
  onSelect,
  options,
  loading = false,
  disabled = false,
  placeholder,
  emptyMessage = 'No matches found',
  helpText,
}: ComboboxProps) {
  const reactId = useId();
  const baseId = `${id}${reactId}`;
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const statusId = `${baseId}-status`;
  const helpId = `${baseId}-help`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Options change under us when a fetch lands or the query changes —
  // drop the highlight rather than pointing at a different option.
  useEffect(() => {
    setActiveIndex(-1);
  }, [options]);

  // Keep the highlighted option scrolled into view while arrowing.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const active = listboxRef.current?.children[activeIndex];
    if (active && 'scrollIntoView' in active) {
      (active as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const commit = (option: ComboboxOption) => {
    onSelect(option.id);
    close();
  };

  const handleInputChange = (text: string) => {
    onInputChange(text);
    setActiveIndex(-1);
    setOpen(true);
  };

  const handleInputBlur = () => {
    close();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(options.length > 0 ? 0 : -1);
        } else if (options.length > 0) {
          setActiveIndex((index) => (index + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(options.length > 0 ? options.length - 1 : -1);
        } else if (options.length > 0) {
          setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
        }
        break;
      case 'Home':
        if (open && options.length > 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (open && options.length > 0) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case 'Enter': {
        if (open && activeIndex >= 0 && activeIndex < options.length) {
          event.preventDefault();
          commit(options[activeIndex]);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        if (open) {
          close();
        } else if (selectedOptionId) {
          onSelect(null);
        }
        break;
      case 'Tab':
        // Move on without committing a half-browsed option.
        close();
        break;
      default:
        break;
    }
  };

  const showPopup = open && !disabled;
  // An empty `emptyMessage` suppresses the empty state entirely — used when
  // the text is still too short for the parent to have searched at all.
  const showEmpty =
    showPopup && !loading && options.length === 0 && inputValue.trim().length > 0 && emptyMessage !== '';

  // Single polite status string; screen readers announce it on change.
  let statusText = '';
  if (showPopup && loading) {
    statusText = 'Loading suggestions';
  } else if (showPopup && !loading && options.length > 0) {
    const count = options.length;
    const activeDescription =
      activeIndex >= 0 ? ` ${options[activeIndex].label},` : '';
    statusText = `${count} suggestion${count === 1 ? '' : 's'} available.${activeDescription} Use up and down arrows to browse, Enter to select.`;
  } else if (showEmpty) {
    statusText = emptyMessage;
  }

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputRow}>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showPopup}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={
            showPopup && activeIndex >= 0 ? `${baseId}-option-${options[activeIndex].id}` : undefined
          }
          aria-describedby={`${statusId}${helpText ? ` ${helpId}` : ''}`}
          disabled={disabled}
          placeholder={placeholder}
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
        />
        {selectedOptionId && !disabled && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label={`Clear ${label.toLowerCase()}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(null)}
          >
            Clear
          </button>
        )}
      </div>

      {showPopup && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className={styles.listbox}
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${baseId}-option-${option.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''}`}
              // Keep DOM focus on the input: mousedown would blur it and
              // close the popup before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(option)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              {option.hint && <span className={styles.optionHint}>{option.hint}</span>}
            </li>
          ))}
        </ul>
      )}

      {showEmpty && (
        <div className={styles.empty} role="presentation">
          {emptyMessage}
        </div>
      )}

      <p id={statusId} role="status" aria-live="polite" className={styles.visuallyHidden}>
        {statusText}
      </p>
      {helpText && (
        <p id={helpId} className={styles.helpText}>
          {helpText}
        </p>
      )}
    </div>
  );
}
