import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { OnboardingStep } from '../steps';
import styles from './OnboardingChecklist.module.css';

interface OnboardingChecklistProps {
  title: string;
  intro: string;
  steps: OnboardingStep[];
}

/**
 * Presentational first-run checklist. Progress is passed in, never stored
 * here: the dashboard hides the whole panel once the server says every step
 * is complete (returning null keeps the dashboard clean and does not leave a
 * "100%" panel behind forever).
 */
export function OnboardingChecklist({ title, intro, steps }: OnboardingChecklistProps) {
  const headingId = useId();
  const done = steps.filter((step) => step.complete).length;
  const total = steps.length;

  if (total === 0 || done === total) return null;

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <div className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.count}>
          {done} of {total} done
        </p>
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-labelledby={headingId}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} steps complete`}
      >
        <span className={styles.bar} style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <p className={styles.intro}>{intro}</p>

      <ol className={styles.list}>
        {steps.map((step) => (
          <li key={step.key} className={styles.item} data-complete={step.complete}>
            <span className={step.complete ? styles.pillDone : styles.pillTodo}>
              {step.complete ? 'Done' : 'To do'}
            </span>
            <span className={styles.body}>
              <span className={styles.label}>{step.label}</span>
              <span className={styles.description}>{step.description}</span>
            </span>
            {!step.complete && step.to ? (
              <Link className={styles.action} to={step.to} aria-label={`Start: ${step.label}`}>
                Start
              </Link>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
