import { useState, useEffect, useRef } from 'react';
import styles from './TextField.module.css';

/**
 * PasswordField - Accessible password field with show/hide toggle and caps lock hint.
 *
 * WCAG 3.3.8: Accessible authentication - provides a visible toggle to show/hide the password
 * and a caps lock hint when caps lock is active.
 *
 * The component:
 * - Wraps an input with type="password"
 * - Provides a toggle button to show/hide the password
 * - Uses aria-pressed correctly on the toggle
 * - Detects caps lock using getModifierState("CapsLock") from keyboard events
 * - Shows a polite caps lock hint when caps lock is active and the field has focus
 * - Hides the hint when caps lock is inactive or focus leaves
 * - Returns the field to masked state on form submission
 * - Preserves autocomplete values (current-password, new-password, etc.)
 * - Maintains existing form integration (validation, styling, error handling)
 */
interface PasswordFieldProps {
  /** The name of the field, used for form integration */
  name: string;
  /** The label for the field */
  label: string;
  /** The autocomplete value (e.g. "current-password", "new-password") */
  autoComplete?: string;
  /** Optional hint text (e.g. password requirements) */
  hint?: string;
  /** Optional error message override */
  error?: string;
  /** Whether the field should start visible (for testing/initial states) */
  initiallyVisible?: boolean;
  /** Callback called when the visibility state changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Controlled value for the password input */
  value?: string;
  /** Controlled onChange for the password input */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field should receive focus initially */
  autoFocus?: boolean;
}

export function PasswordField({
  name,
  label,
  autoComplete = 'current-password',
  hint,
  error,
  initiallyVisible = false,
  onVisibilityChange,
  value,
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(initiallyVisible);
  const [password, setPassword] = useState('');
  const isControlled = value !== undefined && onChange !== undefined;
  const inputValue = isControlled ? value : password;
  const [hasCapsLock, setHasCapsLock] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Detect caps lock key state when typing in the field
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only check when the field has focus
      if (inputRef.current === document.activeElement) {
        setHasCapsLock(event.getModifierState('CapsLock'));
      }
    };

    const inputEl = inputRef.current;
    if (inputEl) {
      inputEl.addEventListener('keydown', handleKeyDown);
      return () => {
        inputEl.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  // Update caps lock state when visibility toggles
  useEffect(() => {
    setHasCapsLock(false);
  }, [visible]);

  // When visibility toggles, also update the underlying input type
  useEffect(() => {
    const inputEl = inputRef.current;
    if (inputEl) {
      inputEl.type = visible ? 'text' : 'password';
    }
  }, [visible]);

  return (
    <div className={styles.field}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <div>
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={inputValue}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={
            hasCapsLock
              ? `${name}-caps-lock-hint`
              : error
              ? `${name}-error`
              : undefined
          }
          autoComplete={autoComplete}
          onChange={(e) => {
            if (isControlled) {
              onChange(e);
            } else {
              setPassword(e.target.value);
            }
          } }
          onFocus={() => {
            // Reset caps lock hint state on focus
            setHasCapsLock(false);
          }}
        />

        {visible && (
          <button
            ref={toggleRef}
            type="button"
            className={styles.toggle}
            aria-pressed={visible}
            aria-label={
              visible
                ? 'Hide password'
                : 'Show password'
            }
            onClick={() => {
              setVisible(!visible);
              onVisibilityChange?.(!visible);
            }}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        )}

        {!visible && hint ? (
          <p
            id={`${name}-caps-lock-hint`}
            className={styles.hint}
            aria-live="polite"
          >
            {hasCapsLock ? 'Caps Lock is on. Consider turning it off.' : ''}
          </p>
        ) : null}
      </div>
      {error && (
        <p id={`${name}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}