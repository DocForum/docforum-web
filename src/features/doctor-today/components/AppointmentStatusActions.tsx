import { useState } from 'react';
import { Button } from '../../../components/Button';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { ApiError } from '../../../services/api-client';
import { useAppointmentStatusAction } from '../../queue/hooks/useQueue';
import type { Appointment } from '../../../types/models';
import styles from './AppointmentStatusActions.module.css';

type PendingAction = 'no_show' | 'cancelled';

const COPY: Record<PendingAction, { verb: string; confirm: string; failed: string }> = {
  no_show: { verb: 'recorded as a no-show', confirm: 'Mark as no-show', failed: 'Could not mark this visit as a no-show. Try again.' },
  cancelled: { verb: 'cancelled', confirm: 'Cancel visit', failed: 'Could not cancel this visit. Try again.' },
};

export function formatVisitTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * What docforum-core does to a linked referral (assumed cascade — see
 * docs.d/264-appointment-status.md): cancelling always re-pends it, a first
 * no-show re-pends it, and a repeated no-show expires it.
 */
export function referralExplanation(appointment: Appointment, action: PendingAction): string | null {
  const referral = appointment.referral;
  if (!referral) return null;
  if (action === 'no_show' && referral.priorNoShows >= 1) {
    const times = referral.priorNoShows === 1 ? 'once' : `${referral.priorNoShows} times`;
    return `This ${referral.targetSpecialtyName} referral has already had a no-show ${times} — it will expire after this one, so the patient has to be referred again.`;
  }
  const actionText = action === 'cancelled' ? 'cancelling the visit' : 'a no-show';
  return `The ${referral.targetSpecialtyName} referral goes back to pending after ${actionText}, so another doctor can pick it up.`;
}

interface AppointmentStatusActionsProps {
  appointment: Appointment;
  /** Reported at page level so a 409 stays visible after the row refetches away. */
  onConflict?: (message: string) => void;
}

/** "Mark no-show" / "Cancel visit" for a scheduled appointment. */
export function AppointmentStatusActions({ appointment, onConflict }: AppointmentStatusActionsProps) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const mutation = useAppointmentStatusAction();

  const startsAt = Date.parse(appointment.startsAt);
  const canMarkNoShow = Number.isFinite(startsAt) && Date.now() >= startsAt;
  const startLabel = formatVisitTime(appointment.startsAt);

  const open = (action: PendingAction) => {
    setDialogError(null);
    setLocalNotice(null);
    setPending(action);
  };

  const close = () => {
    if (!mutation.isPending) setPending(null);
  };

  const confirm = () => {
    if (!pending) return;
    const action = pending;
    mutation.mutate(
      { appointmentId: appointment.id, status: action },
      {
        onSuccess: () => setPending(null),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setPending(null);
            const message =
              'This visit is no longer scheduled, so nothing was changed. The list has been refreshed.';
            if (onConflict) onConflict(message);
            else setLocalNotice(message);
            return;
          }
          setDialogError(error instanceof Error ? error.message : COPY[action].failed);
        },
      },
    );
  };

  const consequence = pending ? referralExplanation(appointment, pending) : null;

  return (
    <div className={styles.actions}>
      <Button
        variant="secondary"
        onClick={() => open('no_show')}
        disabled={!canMarkNoShow}
        aria-label={`Mark no-show: ${appointment.patientName}`}
        title={
          canMarkNoShow
            ? undefined
            : `Available once the appointment start time (${startLabel}) has passed`
        }
      >
        Mark no-show
      </Button>
      {!canMarkNoShow && <span className={styles.hint}>No-show after {startLabel}</span>}
      <Button
        variant="secondary"
        onClick={() => open('cancelled')}
        aria-label={`Cancel visit: ${appointment.patientName}`}
      >
        Cancel visit
      </Button>

      {localNotice && (
        <p role="status" className={styles.notice}>
          {localNotice}
        </p>
      )}

      {pending && (
        <ConfirmDialog
          title={
            pending === 'no_show'
              ? `Mark ${appointment.patientName} as no-show?`
              : `Cancel ${appointment.patientName}'s visit?`
          }
          description={
            <>
              <p>
                {appointment.patientName}'s {startLabel} appointment will be {COPY[pending].verb}. This can't be
                undone from here.
              </p>
              {consequence && <p className={styles.referralNotice}>{consequence}</p>}
            </>
          }
          confirmLabel={COPY[pending].confirm}
          cancelLabel="Keep visit"
          confirmVariant="danger"
          busy={mutation.isPending}
          error={dialogError}
          onConfirm={confirm}
          onClose={close}
        />
      )}
    </div>
  );
}
