import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { Button } from '../../../components/Button';
import { ApiError } from '../../../services/api-client';
import { useMedicationSchedule } from '../hooks/useMedicationSchedule';
import { buildIcs, downloadIcs } from '../ics';
import type { MedicationSchedule as Schedule, ScheduleDay } from '../schedule';
import styles from './MedicationSchedule.module.css';

function DoseList({ day }: { day: ScheduleDay }) {
  if (day.entries.length === 0) {
    return <p className={styles.noDoses}>No doses scheduled.</p>;
  }
  return (
    <ol className={styles.doseList}>
      {day.entries.map((entry) => (
        <li key={entry.key} className={styles.dose}>
          <span className={styles.doseTime}>{entry.time}</span>
          <span className={styles.doseDrug}>{entry.drugName}</span>
          {entry.dosage && <span className={styles.doseAmount}>{entry.dosage}</span>}
        </li>
      ))}
    </ol>
  );
}

function hasScheduledDoses(schedule: Schedule): boolean {
  return schedule.days.some((day) => day.entries.length > 0);
}

export function MedicationSchedule() {
  const scheduleQuery = useMedicationSchedule();
  const { data: prescriptions, isLoading, error, schedule } = scheduleQuery;

  if (isLoading) {
    return (
      <div className={styles.root}>
        <Skeleton lines={5} height="1.5rem" label="Loading your medication schedule" />
      </div>
    );
  }

  const apiError =
    error instanceof ApiError ? error.message : error ? 'Failed to load your medication schedule.' : null;
  if (apiError) {
    return (
      <InlineError
        title="Medication schedule couldn't be loaded"
        message={apiError}
        onRetry={() => void scheduleQuery.refetch()}
      />
    );
  }

  const isEmpty = (prescriptions?.length ?? 0) === 0;

  function handleAddToCalendar() {
    downloadIcs(buildIcs(schedule.days));
  }

  return (
    <div className={styles.root}>
      <p className={styles.disclaimer}>
        This schedule is generated from your active prescriptions. Always follow the instructions from your
        prescriber — if anything here differs from what they told you, their instructions take priority.
      </p>

      {isEmpty && (
        <EmptyState
          title="No active prescriptions."
          description="When your prescriber issues an active prescription, your daily dose schedule and timings will appear here."
          action={{ label: 'Back to care summary', to: '/patient' }}
        />
      )}

      {schedule.overlaps.map((overlap) => (
        <p key={overlap.drugName} className={styles.overlap} role="alert">
          You have more than one current course of {overlap.drugName}. Please contact your prescriber or
          pharmacist to confirm which to follow — do not choose between them yourself.
        </p>
      ))}

      {!isEmpty && (
        <>
          <section className={styles.section} aria-labelledby="meds-today">
            <h2 id="meds-today" className={styles.heading}>
              Today
            </h2>
            {schedule.today ? <DoseList day={schedule.today} /> : <p className={styles.noDoses}>No doses scheduled.</p>}
          </section>

          <section className={styles.section} aria-labelledby="meds-week">
            <h2 id="meds-week" className={styles.heading}>
              This week
            </h2>
            <div className={styles.weekGrid}>
              {schedule.days.slice(1).map((day) => (
                <div key={day.dateKey} className={styles.weekDay}>
                  <h3 className={styles.dayLabel}>{day.label}</h3>
                  <DoseList day={day} />
                </div>
              ))}
            </div>
          </section>

          {schedule.unscheduled.length > 0 && (
            <section className={styles.section} aria-labelledby="meds-directed">
              <h2 id="meds-directed" className={styles.heading}>
                Taken as directed — not scheduled
              </h2>
              <p className={styles.note}>
                These are shown exactly as written on your prescription. We do not guess start times for
                "as needed" or free-text instructions, so they never appear as fixed clock times above.
              </p>
              <ul className={styles.directedList}>
                {schedule.unscheduled.map((item) => (
                  <li key={item.itemId} className={styles.directedItem}>
                    <span className={styles.doseDrug}>{item.drugName}</span>
                    {item.dosage && <span className={styles.doseAmount}>{item.dosage}</span>}
                    <span className={styles.verbatim}>{item.frequencyText}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {schedule.ended.length > 0 && (
            <section className={styles.section} aria-labelledby="meds-completed">
              <h2 id="meds-completed" className={styles.heading}>
                Completed courses
              </h2>
              <ul className={styles.completedList}>
                {schedule.ended.map((item) => (
                  <li key={item.itemId} className={styles.completedItem}>
                    <span className={styles.doseDrug}>{item.drugName}</span>
                    {item.dosage && <span className={styles.doseAmount}>{item.dosage}</span>}
                    <span className={styles.completedNote}>Ended {item.endedOn}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className={styles.actions}>
            <Button variant="secondary" onClick={handleAddToCalendar} disabled={!hasScheduledDoses(schedule)}>
              Add to calendar (.ics)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
