import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { ApiError } from '../../../services/api-client';
import type { WaitlistEntry } from '../../../types/models';
import { useOfferCountdown } from '../hooks/useOfferCountdown';
import { useAcceptWaitlistOffer, useDeclineWaitlistOffer, useWaitlist } from '../hooks/useWaitlist';
import styles from './Waitlist.module.css';

function formatSlot(start: string, end: string): string {
  const day = new Date(start).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const time = new Date(start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time}–${endTime}`;
}

function OfferCard({ entry }: { entry: WaitlistEntry }) {
  const offer = entry.offer!;
  const query = useWaitlist();
  const acceptMutation = useAcceptWaitlistOffer();
  const declineMutation = useDeclineWaitlistOffer();
  const errorMessage = useErrorMessage();
  const countdown = useOfferCountdown(offer);

  // A lapsed hold is no longer an offer. Refetch once so the list agrees with
  // the server, while the card shows the expired state in the meantime.
  useEffect(() => {
    if (countdown.expired) void query.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the offer lapses
  }, [countdown.expired]);

  const conflict =
    acceptMutation.error instanceof ApiError &&
    (acceptMutation.error.status === 409 || acceptMutation.error.status === 404);

  if (acceptMutation.data) {
    const { appointmentId, requiresIntake } = acceptMutation.data.result;
    return (
      <div className={styles.booked} role="status" aria-live="polite">
        <h2 className={styles.offerHeading}>Appointment booked</h2>
        <p>
          The slot is yours — {formatSlot(offer.startsAt, offer.endsAt)} with {offer.doctorName}.
        </p>
        <div className={styles.dialogActions}>
          {requiresIntake && (
            <Link className={styles.primaryLink} to={`/patient/appointments/${appointmentId}/intake`}>
              Finish your intake
            </Link>
          )}
          <Link className={styles.secondaryLink} to={`/appointments/${appointmentId}`}>
            View the appointment
          </Link>
        </div>
      </div>
    );
  }

  if (countdown.expired) {
    return (
      <div className={styles.expired} role="status">
        <h2 className={styles.offerHeading}>This offer expired</h2>
        <p>
          The held slot went back into the doctor’s calendar. You’re still on the waitlist for{' '}
          {offer.specialtyName} — we’ll offer you the next one.
        </p>
        <Link to="/patient/waitlist">See my waitlists</Link>
      </div>
    );
  }

  return (
    <div className={styles.offer} role="region" aria-labelledby={`offer-${offer.id}`}>
      <div className={styles.offerTop}>
        <div>
          <p className={styles.offerEyebrow}>A slot opened up</p>
          <h2 id={`offer-${offer.id}`} className={styles.offerHeading}>
            {formatSlot(offer.startsAt, offer.endsAt)}
          </h2>
          <p className={styles.offerDetail}>
            {offer.doctorName} · {offer.specialtyName}
          </p>
        </div>
        <div
          className={`${styles.countdown} ${countdown.urgent ? styles.countdownUrgent : ''}`}
          role="timer"
          aria-live="off"
        >
          <span className={styles.countdownLabel}>Held for you</span>
          <span className={styles.countdownValue}>{countdown.label}</span>
        </div>
      </div>

      <p className={styles.offerNote}>
        Accept before the countdown ends to book it. After that the slot goes to the next person.
      </p>

      <FormError
        message={
          conflict
            ? 'That slot was taken just before you accepted. You’re still on the waitlist for the next opening.'
            : errorMessage(acceptMutation.error) ?? errorMessage(declineMutation.error)
        }
      />

      <div className={styles.dialogActions}>
        <Button
          onClick={() => acceptMutation.mutate(offer.id)}
          loading={acceptMutation.isPending}
          disabled={declineMutation.isPending}
        >
          Accept this slot
        </Button>
        <Button
          variant="secondary"
          onClick={() => declineMutation.mutate(offer.id)}
          loading={declineMutation.isPending}
          disabled={acceptMutation.isPending}
        >
          Decline
        </Button>
      </div>
    </div>
  );
}

/**
 * The time-boxed offer banner (issue #16), used on the patient care summary
 * and on `/patient/waitlist`. It renders nothing when no offer is open, so
 * mounting it on the home page costs nothing for patients who aren't waiting.
 */
export function WaitlistOfferBanner() {
  const query = useWaitlist();
  const entry = query.data?.items.find((item) => item.offer);

  if (!entry?.offer) return null;

  return (
    <div className={styles.banner}>
      <OfferCard key={entry.offer.id} entry={entry} />
    </div>
  );
}
