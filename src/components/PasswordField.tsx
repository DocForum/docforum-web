import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { useController, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { useT } from '../i18n/useT';
import styles from './TextField.module.css';

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  /** Persistent guidance (e.g. length rules), announced with the field. */
  hint?: string;
}

/**
 * A password input with an accessible show/hide toggle and a Caps Lock hint
 * (issue #243, WCAG 3.3.8).
 *
 * - The toggle is a real `<button type="button">` with `aria-pressed` and a
 *   constant label, so its state is announced without the name changing.
 * - While the field has focus and Caps Lock is on, a polite hint is shown and
 *   linked through `aria-describedby`.
 * - Submitting the surrounding form switches back to masked, so the plaintext
 *   is not left on screen.
 * - `autoComplete` and every other native attribute are forwarded unchanged so
 *   password managers keep working.
 *
 * This is the controlled, form-library-agnostic version; use `PasswordField`
 * inside a react-hook-form `FormProvider`.
 */
export function PasswordInput({
  label,
  error,
  hint,
  id,
  onKeyDown,
  onKeyUp,
  onFocus,
  onBlur,
  ...rest
}: PasswordInputProps) {
  const t = useT();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const capsId = `${inputId}-caps-lock`;
  const errorId = error ? `${inputId}-error` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const showCapsHint = focused && capsLock;
  const describedBy =
    [hintId, showCapsHint ? capsId : undefined, errorId].filter(Boolean).join(' ') || undefined;

  // Mask again whenever the surrounding form is submitted.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;
    const mask = () => setVisible(false);
    form.addEventListener('submit', mask);
    return () => form.removeEventListener('submit', mask);
  }, []);

  const readCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === 'function') {
      setCapsLock(event.getModifierState('CapsLock'));
    }
  };

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.passwordControl}>
        <input
          ref={inputRef}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onKeyDown={(event) => {
            readCapsLock(event);
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            readCapsLock(event);
            onKeyUp?.(event);
          }}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-pressed={visible}
          aria-controls={inputId}
          onClick={() => setVisible((current) => !current)}
        >
          {t('passwordField.show', 'Show password')}
        </button>
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {showCapsHint && (
        <p id={capsId} className={styles.capsHint} role="status">
          {t('passwordField.capsLockOn', 'Caps Lock is on.')}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export interface PasswordFieldProps<
  TFieldValues extends FieldValues,
  TFieldName extends FieldPath<TFieldValues>,
> extends Omit<PasswordInputProps, 'value' | 'onChange' | 'onBlur' | 'name'> {
  name: TFieldName;
}

/**
 * `PasswordInput` wired to react-hook-form via `useController`, exactly like
 * `FormField`: the value and the zod error come from form context, so the
 * password is submitted with the rest of the form.
 */
export function PasswordField<
  TFieldValues extends FieldValues,
  TFieldName extends FieldPath<TFieldValues>,
>({ name, error: errorOverride, ...rest }: PasswordFieldProps<TFieldValues, TFieldName>) {
  const { control } = useFormContext<TFieldValues>();
  const {
    field: { value, onChange, onBlur, name: fieldName },
    fieldState: { error },
  } = useController({ name, control });

  return (
    <PasswordInput
      name={fieldName}
      value={(value as unknown as string) ?? ''}
      onChange={onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
      onBlur={onBlur as unknown as React.FocusEventHandler<HTMLInputElement>}
      error={errorOverride ?? error?.message}
      {...rest}
    />
  );
}
