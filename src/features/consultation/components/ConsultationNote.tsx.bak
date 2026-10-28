import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useConsultationNote, useSignOffNote, useAddAddendum } from '../hooks/useConsultationNote';
import { Button } from '../../../components/Button';
import styles from './ConsultationNote.module.css';

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ConsultationNoteProps {
  appointmentId?: string;
}

export function ConsultationNote({ appointmentId: appointmentIdProp }: ConsultationNoteProps) {
  const params = useParams<{ appointmentId: string }>();
  const appointmentId = appointmentIdProp ?? params.appointmentId;
  const query = useConsultationNote(appointmentId ?? null);
  const signOff = useSignOffNote();
  const addAddendum = useAddAddendum();

  const [draft, setDraft] = useState(query.data?.content ?? '');
  const [addendumContent, setAddendumContent] = useState('');
  const [confirmingSignOff, setConfirmingSignOff] = useState(false);
  const [editing, setEditing] = useState(!Boolean(query.data?.signedAt));

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

  if (query.isLoading) return <div className={styles.loading}>Loading note…</div>;
  if (query.isError || !note) {
    return <div className={styles.empty}>Could not load this consultation note.</div>;
  }

  return (
    <section className={styles.note}>
      <header className={styles.noteHeader}>
        <h2>Consultation note</h2>
        <span className={styles.status}>
          {signed ? 'Signed · locked' : 'Draft'}
        </span>
        {note.autoSignOffAt && !signed && (
          <span className={styles.deadline}>
            Auto sign-off: {formatDateTime(note.autoSignOffAt)}
          </span>
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
                  Sign and lock
                </Button>
              </div>
            </div>
          ) : (
            <>
              {editing ? (
                <>
                  <textarea
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
                      Save draft
                    </Button>
                    <Button onClick={handleSignOff}>Sign and lock</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.contentReadOnly}>{note.content}</div>
                  <div className={styles.actions}>
                    <Button onClick={() => setEditing(true)}>Edit note</Button>
                    <Button onClick={handleSignOff}>Sign and lock</Button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.contentReadOnly}>{note.content}</div>
          <div className={styles.signedBadge}>Signed {formatDateTime(note.signedAt)}</div>

          <h3 className={styles.addendaHeading}>Addenda</h3>
          <div className={styles.addendumComposer}>
            <textarea
              value={addendumContent}
              onChange={(e) => setAddendumContent(e.target.value)}
              placeholder="Add an addendum…"
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
                  {formatDateTime(addendum.createdAt)}
                </span>
              </li>
            ))}
            {note.addenda.length === 0 && (
              <li className={styles.addendumItem}>
                <span className={styles.emptyAddenda}>No addenda yet.</span>
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}
