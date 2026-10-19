import { Spinner } from './Spinner';

/** Shown while a route's lazy module or loaders resolve. */
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

export function RouteLoading() {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}
      role="status"
      aria-live="polite"
    >
      <Spinner size={28} />
      <span style={visuallyHidden}>Loading page…</span>
    </div>
  );
}
