import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Small variant for tight spaces (e.g. header toolbar). */
  size?: 'small';
  /** Full-width button (e.g. inside a mobile drawer). */
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  size,
  fullWidth,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size && styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`],
    fullWidth && styles.fullWidth,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      style={{ width: fullWidth ? '100%' : undefined }}
      {...rest}
    >
      {loading && <Spinner size={15} />}
      {children}
    </button>
  );
}
