import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Number of stacked placeholder lines. Default 3. */
  lines?: number;
  /** CSS height of each line, e.g. `1rem` or `2.5rem`. Default `1rem`. */
  height?: string;
  /** CSS width of the block. Default `100%`. */
  width?: string;
  /** Announced to screen readers. Default "Loading". */
  label?: string;
  className?: string;
}

/**
 * Low-contrast outline of content that is still loading. The bars are
 * decorative; `label` is announced through a visually hidden status region.
 * Motion stops under `prefers-reduced-motion: reduce` and the outline stays
 * visible, so a loading screen never looks frozen or blank.
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
