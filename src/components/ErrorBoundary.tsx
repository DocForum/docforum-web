import { Component, useContext, type ErrorInfo, type ReactNode } from 'react';
import { IntlContext } from 'react-intl';
import { describeError, supportReference } from '../services/error-catalogue';
import { Button } from './Button';
import styles from './ErrorBoundary.module.css';

export type ErrorBoundaryLevel = 'app' | 'route' | 'section';

export interface ErrorBoundaryFallbackProps {
  error: unknown;
  reset: () => void;
  level: ErrorBoundaryLevel;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * How much of the UI this boundary owns. `route` keeps the app shell and
   * navigation alive; `section` contains a failure to one panel.
   */
  level?: ErrorBoundaryLevel;
  /** Optional heading override (already-translated copy). */
  title?: string;
  /** Called after a successful retry so callers can refetch. */
  onReset?: () => void;
  fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

/**
 * Contains render failures. A child throwing only replaces this boundary's
 * subtree — siblings, the route shell and the app-level error UI are
 * untouched (issue #84).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // Logged for support/diagnostics only. The user never sees this text —
    // render errors can contain internal detail.
    console.error(`[ErrorBoundary:${this.props.level ?? 'section'}]`, error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.reset, level: this.props.level ?? 'section' });
    }

    return (
      <ErrorFallback
        level={this.props.level ?? 'section'}
        title={this.props.title}
        error={this.state.error}
        onReset={this.reset}
      />
    );
  }
}

function ErrorFallback({
  level,
  title,
  error,
  onReset,
}: {
  level: ErrorBoundaryLevel;
  title?: string;
  error: unknown;
  onReset: () => void;
}) {
  // Error boundaries are also rendered directly by route tests and during
  // startup, before the provider may exist. Keep the fallback recoverable in
  // that case while still using the active locale in the normal app tree.
  const intl = useContext(IntlContext);
  const descriptor = describeError(error);
  const reference = supportReference(error);
  const format = (id: string, defaultMessage: string, values?: Record<string, string>) =>
    intl?.formatMessage({ id, defaultMessage }, values);

  const defaultTitle =
    level === 'section'
      ? format('errors.boundary.sectionTitle', 'This section could not be shown')
      : level === 'route'
        ? format('errors.boundary.routeTitle', 'This page could not be shown')
        : format('errors.boundary.appTitle', 'DocForum could not load');

  const message = format(descriptor.messageId, descriptor.defaultMessage);
  const retryLabel = format('errors.actions.tryAgain', 'Try again');

  return (
    <div
      className={`${styles.fallback} ${styles[level]}`}
      role="alert"
      aria-live="assertive"
      data-testid="error-boundary-fallback"
    >
      <h2 className={styles.title}>{title ?? defaultTitle}</h2>
      <p className={styles.message}>{message}</p>
      {reference && (
        <p className={styles.reference}>
          {format('errors.reference', 'Reference: {reference}', { reference })}
        </p>
      )}
      <Button variant="secondary" onClick={onReset}>
        {retryLabel}
      </Button>
    </div>
  );
}
