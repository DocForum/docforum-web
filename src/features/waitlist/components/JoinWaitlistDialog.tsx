import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { FormError } from '../../../components/FormError';
import { useErrorMessage } from '../../../hooks/useErrorText';
import type { PreferredTimeWindow } from '../../../types/models';
import { useJoinWaitlist } from '../hooks/useWaitlist';
import { WINDOW_LABEL } from '../window-label';
import styles from './Waitlist.module.css';

interface Props {
  /** Waitlist for one doctor, one specialty, or (when both are absent) any
   * doctor — e.g. joined from an empty search. */
  doctor?: { id: string; name: string } | null;
  specialty?: { id: string; name: string } | null;
  label?: string;
  variant?: 'primary' | 'secondary';
}

/** "Join waitlist" trigger + preferred-window dialog (issue #16). */
export function JoinWaitlistDialog({ doctor, specialty, label = 'Join waitlist', variant = 'secondary' }: Props) {
  const [open, setOpen] = useState(false);
  const [timeWindow, setTimeWindow] = useState<PreferredTimeWindow>('anytime');
  const [joined, setJoined] = useState(false);
  const joinMutation = useJoinWaitlist();
  const errorMessage = useErrorMessage();

  const target = doctor?.name ?? specialty?.name ?? 'the next available doctor';

  function close() {
    setOpen(false);
    setJoined(false);
    joinMutation.reset();
  }

  function submit() {
    joinMutation.mutate(
      {
        doctorId: doctor?.id ?? null,
        specialtyId: specialty?.id ?? null,
        preferredWindow: timeWindow,
      },
      { onSuccess: () => setJoined(true) },
    );
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        labelledBy="join-waitlist-heading"
        describedBy="join-waitlist-body"
        overlayClassName={styles.overlay}
        panelClassName={styles.dialog}
      >
        <h2 id="join-waitlist-heading" className={styles.dialogHeading}>
          Join the waitlist for {target}
        </h2>

        {joined ? (
          <div role="status" className={styles.joined}>
            <p>
              You’re on the waitlist. When a slot opens inside your preferred window, it is held
              for you for a few minutes and shown at the top of your care summary — accept it there
              to book.
            </p>
            <div className={styles.dialogActions}>
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <p id="join-waitlist-body" className={styles.dialogBody}>
              Choose the part of the day that works for you. You can change this or leave the
              waitlist at any time.
            </p>

            <label className={styles.fieldLabel} htmlFor="waitlist-window">
              Preferred time
            </label>
            <select
              id="waitlist-window"
              className={styles.select}
              value={timeWindow}
              onChange={(event) => setTimeWindow(event.target.value as PreferredTimeWindow)}
            >
              {(Object.keys(WINDOW_LABEL) as PreferredTimeWindow[]).map((value) => (
                <option key={value} value={value}>
                  {WINDOW_LABEL[value]}
                </option>
              ))}
            </select>

            <FormError message={errorMessage(joinMutation.error)} />

            <div className={styles.dialogActions}>
              <Button onClick={submit} loading={joinMutation.isPending}>
                Join waitlist
              </Button>
              <Button variant="secondary" onClick={close} disabled={joinMutation.isPending}>
                Cancel
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
