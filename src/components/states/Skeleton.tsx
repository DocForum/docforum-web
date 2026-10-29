import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Number of stacked placeholder lines. Default 3. */
  lines?: number;
  /** CSS height of each line, e.g. `1rem` or `2.5rem`. Default `1rem`. */
  height?: string;
  /** CSS width of the block. Default `100%`. Lines after the first are 90%,
   * 70%… so the block reads as text rather than a solid bar. */
  width?: string;
  /** Announced to screen readers. Default "Loading". */
  label?: string;
  className?: string;
}

/**
 * Placeholder for content that is still loading (issue #106).
 *
 * Reads as a quiet, low-contrast outline of the content that will arrive, not
 * a "shimmer" showpiece: motion stops entirely under
 * `prefers-reduced-motion: reduce` and the block stays visible as a static
 * outline, so a loading screen never looks frozen or blank.
 *
 * Always pair it with real text for assistive tech (`label`, exposed through a
 * visually hidden `role="status"`), because the bars themselves are decorative.
 */
export function Skeleton({ lines = 3, height = '1rem', width = '100%', label = 'Loading', className }: SkeletonProps) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <span className={styles.srOnly}>{label}…</span>
      <div aria-hidden="true" className={styles.lines}>
        {Array.from({ length: Math.max(1, lines) }, (_, index) => (
          <span
            key={index}
            className={styles.line}
            style={{
              height,
              width: index === 0 ? width : `calc(${width} - ${Math.min(index, 3) * 8}%)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
