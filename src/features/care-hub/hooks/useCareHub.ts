import { useDependents } from '../../dependents/hooks/useDependents';
import { useHealthEntries } from '../../health-profile/hooks/useHealthEntries';
import { useMyAppointments } from '../../appointments/hooks/useAppointments';
import { useMyOrders } from '../../orders/hooks/useOrders';
import { formatSlotDate, formatSlotTime, isOnSlotDay, isUpcoming } from '../../appointments/slot';
import { useFormat } from '../../../i18n/useFormat';
import { useT } from '../../../i18n/useT';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import type { HealthSectionKey } from '../../../types/models';
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
  sources: { dependents: SourceStatus; health: SourceStatus; appointments: SourceStatus; orders: SourceStatus };
}

/** A handover invite with no expiry sent by the backend is not the same thing
 * as an expired one, so absence must not read as "blocked". */
function inviteExpired(expiresAt?: string): boolean {
  return Boolean(expiresAt && new Date(expiresAt) < new Date());
}

/** Health section ids come from the API — one static label call per id. */
function sectionLabel(section: HealthSectionKey, t: ReturnType<typeof useT>): string {
  switch (section) {
    case 'allergies':
      return t('health.section.allergies', 'Allergies');
    case 'conditions':
      return t('health.section.conditions', 'Conditions');
    case 'medications':
      return t('health.section.medications', 'Current medications');
  }
}

export function useCareHub(now: Date = new Date()): CareHub {
  const t = useT();
  const { formatDate } = useFormat();
  const accessToken = useAuthStore((state) => state.accessToken);
  const profileId = useProfileStore((state) => state.selectedProfileId);
  const dependents = useDependents();
  const appointments = useMyAppointments();
  const orders = useMyOrders();
  const allergies = useHealthEntries('allergies');
  const conditions = useHealthEntries('conditions');
  const medications = useHealthEntries('medications');
  const healthQueries = [allergies, conditions, medications];

  const dependentsUnavailable = !accessToken;
  const appointmentsUnavailable = !accessToken;
  const ordersUnavailable = !accessToken;
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
        title: t('care.hub.handover.expired.title', "Resend {name}'s invite", {
          name: dependent.fullName,
        }),
        detail: t(
          'care.hub.handover.expired.detail',
          'Their handover invite expired before they claimed it, so they still cannot manage their own record.',
        ),
        to: '/patient/dependents',
        badge: t('care.hub.handover.expired.badge', 'Invite expired'),
      });
    } else if (dependent.handoverStatus === 'eligible') {
      cards.push({
        id: `handover-eligible-${dependent.id}`,
        section: 'action',
        priority: PRIORITY.needsYou,
        title: t('care.hub.handover.eligible.title', "Start {name}'s handover", {
          name: dependent.fullName,
        }),
        detail: t(
          'care.hub.handover.eligible.detail',
          'They are approaching the age where they can manage their own health record.',
        ),
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
      title: today
        ? t('care.hub.appointment.today.title', 'Check in for your visit today')
        : t('care.hub.appointment.later.title', 'Visit {date} at {time}', {
            date: formatSlotDate(startsAt, now),
            time: formatSlotTime(startsAt),
          }),
      detail: today
        ? t(
            'care.hub.appointment.today.detail',
            'Your appointment is at {time}. Open it to check in and see your place in the queue.',
            { time: formatSlotTime(startsAt) },
          )
        : t('care.hub.appointment.later.detail', 'Check-in opens on the day of your visit.'),
      to: `/patient/appointments/${appointment.id}`,
      badge: today ? t('care.hub.appointment.badge', 'Today') : undefined,
    });
  }

  // Fulfilled orders that need confirmation (issue #35).
  for (const order of orders.data ?? []) {
    if (order.status !== 'completed' || !order.confirmationWindow) continue;
    const deadline = new Date(order.confirmationWindow.deadlineAt);
    if (deadline < now) continue; // Expired window - no action needed
    const itemLabel = order.orderType === 'prescription' ? order.medication : order.testName;
    cards.push({
      id: `confirm-order-${order.id}`,
      section: 'action',
      priority: PRIORITY.needsYou,
      title: t('care.hub.order.title', 'Confirm receipt of {item}', { item: itemLabel }),
      detail: t(
        'care.hub.order.detail',
        'Your order was fulfilled. Please confirm you received it or report a problem.',
      ),
      to: `/patient/orders/${order.id}`,
      badge: t('care.hub.order.badge', 'Action needed'),
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
      title: t('care.hub.healthEmpty.title', 'Add your allergies, conditions and medications'),
      detail: t('care.hub.healthEmpty.detail', 'Doctors see these at every consult. Yours are all still empty.'),
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
        title: t('care.hub.healthUpdated.title', '{name} updated', { name: entry.name }),
        detail: t('care.hub.healthUpdated.detail', 'Your {section} list changed on {date}.', {
          section: sectionLabel(entry.section, t),
          date: formatDate(entry.updatedAt),
        }),
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
      orders: {
        isLoading: !ordersUnavailable && orders.isPending,
        failed: !ordersUnavailable && orders.isError,
        unavailable: ordersUnavailable,
      },
      health: {
        isLoading: !healthUnavailable && healthQueries.some((query) => query.isPending),
        failed: !healthUnavailable && healthFailed,
        unavailable: healthUnavailable,
      },
    },
  };
}
