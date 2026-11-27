import { useEffect, useId, useRef } from 'react';
import { useT } from '../i18n/useT';
import styles from './ErrorSummary.module.css';

export interface ErrorSummaryItem {
  /** The DOM id of the invalid control the link moves focus to. */
  fieldId: string;
  /** The user-facing error message (never an internal field name). */
  message: string;
}

export interface ErrorSummaryProps {
  items: ErrorSummaryItem[];
  /**
   * Increments on every submit attempt. Focus moves to the summary when it
   * changes and there are errors; edits that fix errors only update the list,
   * so focus is never pulled away from the field being corrected.
   */
  submitCount: number;
}

/**
 * Builds summary items from a `{ field: message }` map (client validation or
 * `mapServerErrors` output) and a `{ field: domId }` map. Fields without an id
 * or a message are skipped, and the order follows `fieldIds` (form order).
 */
export function errorSummaryItems(
  errors: object,
  fieldIds: Record<string, string>,
): ErrorSummaryItem[] {
  return Object.entries(fieldIds).flatMap(([field, fieldId]) => {
    const message = (errors as Record<string, unknown>)[field];
    return typeof message === 'string' && message ? [{ fieldId, message }] : [];
  });
}

/**
 * A focusable error summary for long forms (issue #242, WCAG 3.3.1/3.3.3).
 *
 * After a failed submit, focus moves to the summary so screen-reader and
 * magnifier users learn how many problems there are; each entry links to the
 * invalid control and moves focus there. Short forms (login, signup) keep the
 * focus-first-invalid-field behaviour instead.
 */
export function ErrorSummary({ items, submitCount }: ErrorSummaryProps) {
  const t = useT();
  const headingId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const lastFocusedSubmit = useRef(submitCount);
  const hasItems = items.length > 0;

  useEffect(() => {
    if (submitCount === lastFocusedSubmit.current || !hasItems) return;
    lastFocusedSubmit.current = submitCount;
    ref.current?.focus();
  }, [submitCount, hasItems]);

  if (!hasItems) return null;

  return (
    <div ref={ref} className={styles.summary} tabIndex={-1} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {t(
          'errorSummary.title',
          '{count, plural, one {There is # problem with this form} other {There are # problems with this form}}',
          { count: items.length },
        )}
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.fieldId}>
            <a
              className={styles.link}
              href={`#${item.fieldId}`}
              onClick={(event) => {
                const target = document.getElementById(item.fieldId);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView?.({ block: 'center' });
                target.focus();
              }}
            >
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
