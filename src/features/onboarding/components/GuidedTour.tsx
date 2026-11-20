import { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import type { TourStep } from '../steps';
import styles from './GuidedTour.module.css';

interface GuidedTourProps {
  label: string;
  steps: TourStep[];
}

/**
 * Optional, skippable first-run tour (#121).
 *
 * Deliberately NOT a modal: no `role="dialog"`, no `aria-modal`, no focus
 * trap and no backdrop — the dashboard stays usable while it is open. It is
 * a labelled region with ordinary buttons, so it works with keyboard and
 * screen readers: Tab reaches every control, Escape closes it, and step
 * changes are announced through an `aria-live="polite"` region.
 */
export function GuidedTour({ label, steps }: GuidedTourProps) {
  const [open, setOpen] = useState(steps.length > 0);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open || steps.length === 0) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <section className={styles.tour} aria-label={label}>
      <p className={styles.counter}>
        Step {index + 1} of {steps.length}
      </p>
      <div aria-live="polite">
        <h2 className={styles.title}>
          {step.title}
        </h2>
        <p className={styles.body}>{step.body}</p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="small" onClick={() => setOpen(false)}>
          Skip tour
        </Button>
        {index > 0 ? (
          <Button variant="secondary" size="small" onClick={() => setIndex((current) => current - 1)}>
            Back
          </Button>
        ) : null}
        {isLast ? (
          <Button size="small" onClick={() => setOpen(false)}>
            Done
          </Button>
        ) : (
          <Button size="small" onClick={() => setIndex((current) => current + 1)}>
            Next
          </Button>
        )}
      </div>
    </section>
  );
}
