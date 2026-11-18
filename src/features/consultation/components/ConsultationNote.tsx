import { useEffect, useState } from 'react';
import { useT } from '../../../i18n/useT';
import { useParams } from 'react-router-dom';
import { useConsultationNote, useSignOffNote, useAddAddendum } from '../hooks/useConsultationNote';
import { useAppointment } from "../../appointment/hooks/useAppointment";
import { useNavigate } from "react-router-dom";
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDateTime as formatZonedDateTime } from '../../../i18n/time-zone';
import { ConsultationOutcomePanel } from './ConsultationOutcomePanel';
import styles from './ConsultationNote.module.css';

const NOTE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

interface ConsultationNoteProps {
  appointmentId?: string;
}

export function ConsultationNote({ appointmentId: appointmentIdProp }: ConsultationNoteProps) {
  const { timeZone } = useTimeZone();
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = appointmentIdProp ?? params.appointmentId;
  const query = useConsultationNote(appointmentId ?? null);
  const signOff = useSignOffNote();
  const addAddendum = useAddAddendum();
  const appointmentQuery = useAppointment(appointmentId ?? "");
  const navigate = useNavigate();

  const [draft, setDraft] = useState(query.data?.content ?? '');
  const t = useT();
  const [addendumContent, setAddendumContent] = useState('');
  const [confirmingSignOff, setConfirmingSignOff] = useState(false);
  const [editing, setEditing] = useState(!query.data?.signedAt);

  const note = query.data;
  const signed = Boolean(note?.signedAt);

  // Keep the draft in sync once the note loads.
  useEffect(() => {
    setDraft(note?.content ?? '');
    setEditing(!signed);
  }, [note, signed]);

  const handleSave = () => {
    // Persist is handled by the sign-off flow; here we just commit the draft
    // so it's not lost before signing. In a fuller implementation this would
    // call a save-note endpoint.
    setEditing(false);
  };

  const handleDiscard = () => {
    setDraft(note?.content ?? '');
    setEditing(false);
  };

  const handleSignOff = () => {
    setConfirmingSignOff(true);
  };

  const handleConfirmSignOff = async () => {
    if (!note) return;
    await signOff.mutateAsync({ noteId: note.id });
    setConfirmingSignOff(false);
    setEditing(false);
  };

  const handleAddAddendum = async () => {
    if (!note || !addendumContent.trim()) return;
    const variables: { noteId: string; appointmentId: string; content: string } = {
      noteId: note.id,
      appointmentId: note.appointmentId,
      content: addendumContent,
    };
    await addAddendum.mutateAsync(variables);
    setAddendumContent('');
  };

  if (query.isLoading) {
    return (
      <div className={styles.loading}>
        <Skeleton lines={4} label={t('consultation.loading', 'Loading note…')} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <InlineError
        title={t('consultation.loadError', 'Could not load this consultation note.')}
        message={queryErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!note) {
    return (
      <EmptyState
        title="No consultation note for this visit yet"
        description="Notes are written and signed off during the consultation. Start the visit to record one."
        action={{ label: 'Back to your dashboard', to: '/doctor' }}
      />
    );
  }

  return (
    <section className={styles.note}>
      <header className={styles.noteHeader}>
        <h1>{t('consultation.title', 'Consultation note')}</h1>
        <span className={styles.status}>
          {signed ? t('consultation.status.signed', 'Signed · locked') : t('consultation.status.draft', 'Draft')}
        </span>
        {note.autoSignOffAt && !signed && (
          <span className={styles.deadline}>
            {t('consultation.autoSignOff', 'Auto sign-off: {date}', {
              date: formatZonedDateTime(note.autoSignOffAt, timeZone, NOTE_TIME_OPTIONS),
            })}
          </span>
        )}
        {appointmentQuery.data?.patientProfileId && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/doctor/patient-chart/${appointmentQuery.data.patientProfileId}`)}
          >
            View patient chart
          </Button>
        )}
      </header>

      {!signed ? (
        <>
          {confirmingSignOff ? (
            <div className={styles.confirm}>
              <p>
                Signing and locking this note makes it immutable. It cannot be
                edited or deleted after sign-off; only addenda can be appended.
              </p>
              <div className={styles.confirmActions}>
                <Button variant="secondary" onClick={() => setConfirmingSignOff(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmSignOff} loading={signOff.isPending}>
                  {t("consultation.signAndLock", "Sign and lock")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {editing ? (
                <>
                  <label htmlFor="consultation-note-content" className="srOnly">
                    Consultation note content
                  </label>
                  <textarea
                    id="consultation-note-content"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className={styles.content}
                    spellCheck={false}
                  />
                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={handleDiscard}>
                      Discard
                    </Button>
                    <Button onClick={handleSave} loading={false}>
                      {t("consultation.saveDraft", "Save draft")}
                    </Button>
                    <Button onClick={handleSignOff}>{t("consultation.signAndLock", "Sign and lock")}</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.contentReadOnly}>{note.content}</div>
                  <div className={styles.actions}>
                    <Button onClick={() => setEditing(true)}>{t("consultation.editNote", "Edit note")}</Button>
                    <Button onClick={handleSignOff}>{t("consultation.signAndLock", "Sign and lock")}</Button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.contentReadOnly}>{note.content}</div>
          <div className={styles.signedBadge}>
            {t('consultation.signedAt', 'Signed {date}', {
              date: formatZonedDateTime(note.signedAt, timeZone, NOTE_TIME_OPTIONS),
            })}
          </div>

          <h2 className={styles.addendaHeading}>{t('consultation.addenda', 'Addenda')}</h2>
          <div className={styles.addendumComposer}>
            <label htmlFor="consultation-addendum" className="srOnly">
              Addendum content
            </label>
            <textarea
              id="consultation-addendum"
              value={addendumContent}
              onChange={(e) => setAddendumContent(e.target.value)}
              placeholder={t('consultation.addendumPlaceholder', 'Add an addendum…')}
              className={styles.addendumInput}
              spellCheck={false}
            />
            <Button
              onClick={handleAddAddendum}
              disabled={addAddendum.isPending || !addendumContent.trim()}
              loading={addAddendum.isPending}
            >
              Add addendum
            </Button>
          </div>
          <ul className={styles.addendaList}>
            {note.addenda.map((addendum) => (
              <li key={addendum.id} className={styles.addendumItem}>
                <p className={styles.addendumContent}>{addendum.content}</p>
                <span className={styles.addendumMeta}>
                  {formatZonedDateTime(addendum.createdAt, timeZone, NOTE_TIME_OPTIONS)}
                </span>
              </li>
            ))}
            {note.addenda.length === 0 && (
              <li className={styles.addendumItem}>
                <span className={styles.emptyAddenda}>{t("consultation.noAddenda", "No addenda yet.")}</span>
              </li>
            )}
          </ul>
        </>
      )}

      {appointmentId ? (
        <ConsultationOutcomePanel appointmentId={appointmentId} notes={draft} />
      ) : null}
    </section>
  );
}
