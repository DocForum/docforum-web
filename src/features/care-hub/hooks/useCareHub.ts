import { useDependents } from '../../dependents/hooks/useDependents';
import { useHealthEntries } from '../../health-profile/hooks/useHealthEntries';
import { useMyAppointments } from '../../appointments/hooks/useAppointments';
import { formatSlotDate, formatSlotTime, isOnSlotDay, isUpcoming } from '../../appointments/slot';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { PRIORITY, type CareCard } from '../ranking';

const RECENT_WINDOW_DAYS = 30;

export interface SourceStatus {
  isLoading: boolean;
  failed: boolean;
  /** The request cannot even be made yet (no session, no profile selected),
   * which is not the same as loading and not the same as failed. */
  unavailable: boolean;
}

export interface CareHub {
  cards: CareCard[];
  sources: { dependents: SourceStatus; health: SourceStatus; appointments: SourceStatus };
}

/** A handover invite with no expiry sent by the backend is not the same thing
 * as an expired one, so absence must not read as "blocked". */
function inviteExpired(expiresAt?: string): boolean {
  return Boolean(expiresAt && new Date(expiresAt) < new Date());
}

export function useCareHub(now: Date = new Date()): CareHub {
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const dependents = useDependents();
  const appointments = useMyAppointments();
  const allergies = useHealthEntries('allergies');
  const conditions = useHealthEntries('conditions');
  const medications = useHealthEntries('medications');
  const healthQueries = [allergies, conditions, medications];

  const dependentsUnavailable = !accessToken;
  const appointmentsUnavailable = !accessToken;
  const healthUnavailable = !accessToken || !profileId;

  const healthEntries = healthQueries.flatMap((query) => query.data ?? []);
  const healthSettled = healthQueries.every((query) => !query.isPending);
  const healthFailed = healthQueries.some((query) => query.isError);

  const cards: CareCard[] = [];

  for (const dependent of dependents.data ?? []) {
    if (dependent.handoverStatus === 'invited' && inviteExpired(dependent.claimInviteExpiresAt)) {
      cards.push({
        id: `handover-expired-${dependent.id}`,
        section: 'action',
        priority: PRIORITY.blockedNow,
        title: `Resend ${dependent.fullName}'s invite`,
        detail: 'Their handover invite expired before they claimed it, so they still cannot manage their own record.',
        to: '/patient/dependents',
        badge: 'Invite expired',
      });
    } else if (dependent.handoverStatus === 'eligible') {
      cards.push({
        id: `handover-eligible-${dependent.id}`,
        section: 'action',
        priority: PRIORITY.needsYou,
        title: `Start ${dependent.fullName}'s handover`,
        detail: 'They are approaching the age where they can manage their own health record.',
        to: '/patient/dependents',
      });
    }
  }

  // A visit happening today is the most concrete thing a patient can act on
  // right now, so it leads "Action needed"; later visits wait in "Coming up".
  for (const appointment of appointments.data ?? []) {
    if (!isUpcoming(appointment, now)) continue;
    const startsAt = appointment.availabilitySlot.startTime;
    const today = isOnSlotDay(appointment, now);
    cards.push({
      id: `appointment-${appointment.id}`,
      section: today ? 'action' : 'upcoming',
      priority: today ? PRIORITY.needsYou : PRIORITY.goodToKnow,
      title: today ? 'Check in for your visit today' : `Visit ${formatSlotDate(startsAt, now)} at ${formatSlotTime(startsAt)}`,
      detail: today
        ? `Your appointment is at ${formatSlotTime(startsAt)}. Open it to check in and see your place in the queue.`
        : 'Check-in opens on the day of your visit.',
      to: `/patient/appointments/${appointment.id}`,
      badge: today ? 'Today' : undefined,
    });
  }

  // Only claim the profile is empty once every section answered successfully —
  // a failed request would otherwise be reported to the patient as missing care
  // data they may well have already entered.
  if (dependents.isSuccess && healthSettled && !healthFailed && healthEntries.length === 0) {
    cards.push({
      id: 'health-profile-empty',
      section: 'action',
      priority: PRIORITY.goodToKnow,
      title: 'Add your allergies, conditions and medications',
      detail: 'Doctors see these at every consult. Yours are all still empty.',
      to: '/patient/health',
    });
  }

  for (const entry of healthEntries) {
    const updated = new Date(entry.updatedAt);
    if (Number.isNaN(updated.getTime())) continue;
    if (updated.getTime() > now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      cards.push({
        id: `health-updated-${entry.id}`,
        section: 'recent',
        priority: PRIORITY.recent,
        title: `${entry.name} updated`,
        detail: `Your ${entry.section} list changed on ${formatDate(entry.updatedAt)}.`,
        to: '/patient/health',
      });
    }
  }

  return {
    cards,
    sources: {
      dependents: {
        isLoading: !dependentsUnavailable && dependents.isPending,
        failed: !dependentsUnavailable && dependents.isError,
        unavailable: dependentsUnavailable,
      },
      appointments: {
        isLoading: !appointmentsUnavailable && appointments.isPending,
        failed: !appointmentsUnavailable && appointments.isError,
        unavailable: appointmentsUnavailable,
      },
      health: {
        isLoading: !healthUnavailable && healthQueries.some((query) => query.isPending),
        failed: !healthUnavailable && healthFailed,
        unavailable: healthUnavailable,
      },
    },
  };
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}
