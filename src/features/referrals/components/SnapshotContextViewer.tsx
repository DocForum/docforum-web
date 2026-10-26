import type { ReferralDetail } from '../../../types/models';
import styles from './SnapshotContextViewer.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** The core of issue #41: everything rendered here comes from fields frozen
 * on the referral payload itself (`snapshotNotes`, `intakeSnapshot`,
 * `snapshotTakenAt`). This component imports no service at all — there is
 * deliberately no consultation/notes module in this feature folder, because
 * the snapshot is self-contained and substituting live notes would break the
 * product's guarantee. */
export function SnapshotContextViewer({ referral }: { referral: ReferralDetail }) {
  const { intakeSnapshot, referringDoctor, snapshotNotes, snapshotTakenAt, targetSpecialty } = referral;

  return (
    <section className={styles.root} aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading" className={styles.heading}>
        Snapshot context
      </h2>

      <p className={styles.snapshotLabel}>
        <strong>
          Snapshot taken <time dateTime={snapshotTakenAt}>{formatDate(snapshotTakenAt)}</time>
        </strong>
      </p>

      <p className={styles.explainer}>
        This is a frozen copy of the patient&rsquo;s intake and the referring doctor&rsquo;s notes, captured when
        the referral was created. It does not change as live records are updated — it is the whole context this
        referral carries, so the patient never has to re-explain.
      </p>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Referring doctor</dt>
          <dd>{referringDoctor.fullName}</dd>
        </div>
        {targetSpecialty ? (
          <div className={styles.metaRow}>
            <dt>Target specialty</dt>
            <dd>{targetSpecialty.name}</dd>
          </div>
        ) : null}
        <div className={styles.metaRow}>
          <dt>Intake submitted</dt>
          <dd>
            <time dateTime={intakeSnapshot.submittedAt}>{formatDate(intakeSnapshot.submittedAt)}</time>
          </dd>
        </div>
      </dl>

      <h3 className={styles.subheading}>Snapshot intake</h3>
      {intakeSnapshot.symptoms.length > 0 ? (
        <ul className={styles.symptoms}>
          {intakeSnapshot.symptoms.map((symptom, index) => (
            <li key={`${index}-${symptom}`} className={styles.symptom}>
              {symptom}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.none}>No symptoms were recorded in the snapshot.</p>
      )}

      {intakeSnapshot.freeTextNotes ? (
        <>
          <h3 className={styles.subheading}>Patient&rsquo;s free-text notes</h3>
          <p className={styles.quote}>{intakeSnapshot.freeTextNotes}</p>
        </>
      ) : null}

      <h3 className={styles.subheading}>Referring doctor&rsquo;s notes</h3>
      <p className={styles.quote}>{snapshotNotes}</p>
    </section>
  );
}
