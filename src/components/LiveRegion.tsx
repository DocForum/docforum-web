interface LiveRegionProps {
  message: string;
  /** `polite` for status updates; `assertive` only for errors. */
  politeness?: 'polite' | 'assertive';
}

/**
 * Visually hidden status region. Keep the element mounted permanently and
 * swap its text — mounting/unmounting a live region is unreliable across
 * screen readers. Batching belongs in the caller (`useAnnouncer`).
 */
export function LiveRegion({ message, politeness = 'polite' }: LiveRegionProps) {
  return (
    <p
      className="srOnly"
      role={politeness === 'assertive' ? 'alert' : 'status'}
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </p>
  );
}
