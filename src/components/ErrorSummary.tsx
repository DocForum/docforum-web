import { useEffect, useState } from 'react';

/**
 * ErrorSummary - Accessible error summary for long forms.
 *
 * Provides a clearly titled, accessible error summary at the top of long forms.
 * Reads errors from react-hook-form, renders links to invalid fields, and manages
 * focus for keyboard and screen-reader users.
 *
 * WCAG 3.3.1: Error identification - helps users identify errors quickly.
 * WCAG 3.3.3: Error suggestions - provides links to the error fields.
 * WCAG 3.3.8: Accessible authentication - focus management for error recovery.
 */
export interface ErrorSummaryProps {
  /** react-hook-form formState.errors object */
  errors: Record<string, { message: string }>;
  /** Optional callback called when focus is moved to the summary */
  onFocusSummary?: () => void;
  /** Optional prefix for field IDs (for nested form structures) */
  idPrefix?: string;
}

/**
 * Generates a stable ID from a field name, suitable for use as a link target.
 * Ensures uniqueness by appending a counter if needed.
 */
function generateFieldId(fieldName: string, prefix?: string): string {
  const clean = prefix ? `${prefix}-${fieldName}` : fieldName;
  // Convert camelCase or PascalCase to kebab-case for stable IDs
  return clean
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/^-/, '');
}

/**
 * ErrorSummary - Accessible error summary for long forms.
 *
 * Provides a clearly titled, accessible error summary at the top of long forms.
 * Reads errors from react-hook-form, renders links to invalid fields, and manages
 * focus for keyboard and screen-reader users.
 *
 * WCAG 3.3.1: Error identification - helps users identify errors quickly.
 * WCAG 3.3.3: Error suggestions - provides links to the error fields.
 * WCAG 3.3.8: Accessible authentication - focus management for error recovery.
 */
export function ErrorSummary({
  errors,
  onFocusSummary,
  idPrefix = 'form',
}: ErrorSummaryProps) {
  // Generate unique field IDs and valid link targets from the errors
  const errorEntries = Object.entries(errors);
  const fieldLinks = errorEntries.map(([fieldName, { message }], index) => {
    const fieldId = generateFieldId(fieldName, idPrefix);
    return { fieldName, message, fieldId, index };
  });

  // Track which field IDs have been used to avoid duplicates
  const usedIds = new Set<string>();
  const uniqueLinks = fieldLinks.filter((link) => {
    if (usedIds.has(link.fieldId)) {
      // If duplicate, keep the first occurrence and skip subsequent ones
      return false;
    }
    usedIds.add(link.fieldId);
    return true;
  });

  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // Move focus to the error summary after a failed submission
    // Only if the summary is mounted and there are errors
    const summaryEl = document.getElementById('error-summary');
    if (summaryEl && !focused && uniqueLinks.length > 0) {
      summaryEl.focus();
      setFocused(true);
      onFocusSummary?.();
    }
  }, [focused, uniqueLinks.length, onFocusSummary]);

  return (
    <div
      id="error-summary"
      className="error-summary"
      role="alert"
      aria-live="polite"
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <h2 id="error-summary-title" className="error-summary-title">
        {uniqueLinks.length} {uniqueLinks.length === 1 ? 'error' : 'errors'} found
      </h2>
      <ul className="error-summary-list">
        {uniqueLinks.map(({ fieldName, message, fieldId, index }) => (
          <li key={index} className="error-summary-item">
            <a
              href={`#${fieldId}`}
              className="error-summary-link"
              aria-describedby={`error-message-${fieldId}`}
              onClick={(e) => e.preventDefault()}
            >
              {fieldName}: {message}
            </a>
          </li>
        ))}
      </ul>
      {!uniqueLinks.length && (
        <p className="error-summary-no-errors">No errors</p>
      )}
    </div>
  );
}