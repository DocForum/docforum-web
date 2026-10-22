import { useController, useFormContext, type FieldPath, type FieldValues } from 'react-hook-form';
import { TextField } from '../TextField';

/**
 * Props for `FormField`. In addition to `name`/`label`, any native input
 * attribute (type, placeholder, inputMode, autoComplete, id, …) is
 * accepted and forwarded to the underlying `TextField`. `value`,
 * `onChange`, `onBlur` and `name` are supplied by react-hook-form and
 * must not be passed directly.
 */
export interface FormFieldProps<
  TFieldValues extends FieldValues,
  TFieldName extends FieldPath<TFieldValues>,
> extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'onBlur' | 'name'
  > {
  name: TFieldName;
  label: string;
  /** Override the field error (e.g. a server-side validation error mapped onto this field). */
  error?: string;
  hint?: string;
}

/**
 * A form field built on TextField, wired to react-hook-form via `useController`.
 * Reads the field's value/handlers from form context and renders the
 * zod-produced error message (or an override) associated through
 * `aria-describedby`/`aria-invalid` — matching TextField's existing
 * accessible error wiring.
 */
export function FormField<
  TFieldValues extends FieldValues,
  TFieldName extends FieldPath<TFieldValues>,
>({
  name,
  label,
  error: errorOverride,
  hint,
  ...rest
}: FormFieldProps<TFieldValues, TFieldName>) {
  const { control } = useFormContext<TFieldValues>();
  const {
    field: { value, onChange, onBlur },
    fieldState: { error },
  } = useController({ name, control });
  const displayError = errorOverride ?? error?.message;

  return (
    <TextField
      label={label}
      error={displayError}
      value={value as unknown as string}
      onChange={onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
      onBlur={onBlur as unknown as React.FocusEventHandler<HTMLInputElement>}
      {...rest}
    />
  );
}
