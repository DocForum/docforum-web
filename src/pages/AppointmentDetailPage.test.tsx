import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { Link, Route, Routes } from 'react-router-dom';
import { ApiError } from '../services/api-client';
import * as appointmentsService from '../services/appointments-service';
import { useAuthStore } from '../store/auth-store';
import type { AppointmentQueue, AvailabilitySlot, DoctorProfile, PatientAppointment } from '../types/models';
import { createQueryClient, render, screen, waitFor } from '../test/render';
import { formatSlotDateTime } from '../features/appointments/slots';
import { appointmentsKeys } from '../features/appointments/hooks/useAppointments';
import { AppointmentDetailPage } from './AppointmentDetailPage';

vi.mock('../services/appointments-service');

// The queue hook owns a poll timer, so the queue tests drive it directly: what
// is being proved there is which *page states* mount a live queue at all.
const queueHook = vi.hoisted(() => vi.fn());
vi.mock('../features/appointments/hooks/useAppointmentQueue', () => ({
  QUEUE_POLL_INTERVAL_MS: 15_000,
  useAppointmentQueue: queueHook,
  useCheckIn: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useQueueNotification: () => ({
    permission: 'unsupported',
    canNotify: false,
    canRequest: false,
    requestPermission: vi.fn(),
    notify: vi.fn(),
  }),
}));

function makeSlot(id: string, startIso: string): AvailabilitySlot {
  return {
    id,
    doctorProfileId: 'dp-1',
    status: 'booked',
    startTime: startIso,
    endTime: new Date(Date.parse(startIso) + 30 * 60_000).toISOString(),
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

function makeAppointment(slot: AvailabilitySlot, overrides: Partial<PatientAppointment> = {}): PatientAppointment {
  return {
    id: 'appt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: slot.id,
    status: 'scheduled',
    origin: 'direct_booking',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    availabilitySlot: slot,
    ...overrides,
  };
}

const DOCTOR: DoctorProfile = {
  id: 'dp-1',
  userId: 'u-doc',
  fullName: 'Dr. Ada Lovelace',
  verificationStatus: 'verified',
};

/** Always in the future, whatever day the suite runs on. */
function isoInDays(days: number, hourUtc: number, minuteUtc = 0): string {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setUTCHours(hourUtc, minuteUtc, 0, 0);
  return date.toISOString();
}

const CURRENT_SLOT = makeSlot('slot-current', isoInDays(7, 9));
const APPOINTMENT = makeAppointment(CURRENT_SLOT);
const ORIGINAL_TIME = formatSlotDateTime(CURRENT_SLOT);

const NEW_SLOT: AvailabilitySlot = { ...makeSlot('slot-new', isoInDays(8, 14)), status: 'open' };

const NOW = new Date('2026-10-16T12:00:00Z');

const QUEUE: AppointmentQueue = {
  appointmentId: 'apt-1',
  phase: 'waiting',
  peopleAhead: 2,
  estimatedWaitMinutes: 9,
  checkInOpensAt: null,
  checkedInAt: '2026-10-16T11:40:00Z',
};

function appointment(overrides: Partial<PatientAppointment> = {}): PatientAppointment {
  const slotStart = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
  return {
    id: 'apt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-1',
    status: 'scheduled',
    origin: 'direct_booking',
    createdAt: '2026-10-13T09:00:00Z',
    updatedAt: '2026-10-13T09:00:00Z',
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      createdAt: '2026-10-01T09:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
    ...overrides,
  };
}

function renderPage({ queryClient }: { queryClient: QueryClient } = { queryClient: createQueryClient() }) {
  const result = render(
    <Routes>
      <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
    </Routes>,
    { route: '/appointments/appt-1', queryClient },
  );
  return { ...result, queryClient };
}

function renderAt(path: string) {
  const queryClient = createQueryClient();
  return render(
    <Routes>
      <Route path="/patient/appointments/:appointmentId" element={<AppointmentDetailPage />} />
    </Routes>,
    { route: path, queryClient },
  );
}

describe('AppointmentDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.listMyAppointments).mockReset();
    vi.mocked(appointmentsService.getDoctorProfile).mockReset();
    vi.mocked(appointmentsService.getOpenSlots).mockReset();
    vi.mocked(appointmentsService.rescheduleAppointment).mockReset();
    queueHook.mockReset();
    queueHook.mockReturnValue({
      data: QUEUE,
      error: null,
      isError: false,
      isFetching: false,
      dataUpdatedAt: Date.now(),
    } as never);
  });

  it('shows the clinician, time, status, intake summary and actions', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT]);
    vi.mocked(appointmentsService.getDoctorProfile).mockResolvedValue(DOCTOR);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Your appointment' })).toBeInTheDocument();
    expect(screen.getByText(DOCTOR.fullName)).toBeInTheDocument();
    expect(screen.getByText(ORIGINAL_TIME)).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Confirmed — this appointment is going ahead.')).toBeInTheDocument();
    expect(screen.getByTestId('intake-unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reschedule' })).toBeEnabled();
    expect(appointmentsService.listMyAppointments).toHaveBeenCalledWith('test-token');
  });

  it('renders the intake summary when the payload carries one', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([
      makeAppointment(CURRENT_SLOT, {
        intake: {
          id: 'intake-1',
          createdAt: isoInDays(6, 8),
          symptoms: ['Sore throat', 'Fever'],
          freeTextNotes: 'Started three days ago, worse at night.',
        },
      }),
    ]);
    vi.mocked(appointmentsService.getDoctorProfile).mockResolvedValue(DOCTOR);

    renderPage();

    expect(await screen.findByText('Sore throat')).toBeInTheDocument();
    expect(screen.getByText('Fever')).toBeInTheDocument();
    expect(screen.getByText('Started three days ago, worse at night.')).toBeInTheDocument();
    expect(screen.queryByTestId('intake-unavailable')).not.toBeInTheDocument();
  });

  it('disables reschedule inside the cutoff window and says why', async () => {
    const soon = makeSlot('slot-soon', new Date(Date.now() + 45 * 60_000).toISOString());
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([makeAppointment(soon)]);
    vi.mocked(appointmentsService.getDoctorProfile).mockResolvedValue(DOCTOR);

    renderPage();

    const button = await screen.findByRole('button', { name: 'Reschedule' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-describedby', 'reschedule-reason');

    const reason = await screen.findByText(/Rescheduling closes 2 hours before your appointment/);
    expect(reason).toHaveAttribute('id', 'reschedule-reason');
    expect(reason).toHaveTextContent(/starts in \d+ minutes|starts in \d+ hours/);
  });

  it('keeps the original appointment on screen when the new slot is taken (409)', async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData(appointmentsKeys.list, [APPOINTMENT]);
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT]);
    vi.mocked(appointmentsService.getDoctorProfile).mockResolvedValue(DOCTOR);
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([NEW_SLOT]);
    vi.mocked(appointmentsService.rescheduleAppointment).mockRejectedValue(
      new ApiError('This slot is no longer available.', 409),
    );

    renderPage({ queryClient });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reschedule' }));
    await user.click(await screen.findByRole('button', { name: `${formatSlotDateTime(NEW_SLOT)}` }));
    await user.click(screen.getByRole('button', { name: 'Review change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reschedule' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/That time was just taken by someone else/);

    // The appointment the patient holds is still right there on the page…
    expect(screen.getAllByText(ORIGINAL_TIME).length).toBeGreaterThan(0);
    expect(screen.getByText('Confirmed — this appointment is going ahead.')).toBeInTheDocument();
    // …and no state implies they suddenly have none.
    expect(screen.queryByText(/couldn.t find that appointment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no appointments/i)).not.toBeInTheDocument();

    // Only the slot list was refreshed; list and detail caches were left alone.
    await waitFor(() => expect(appointmentsService.getOpenSlots).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.slotsRoot });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: appointmentsKeys.list });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: appointmentsKeys.detail('appt-1') });
    expect(queryClient.getQueryData(appointmentsKeys.list)).toEqual([APPOINTMENT]);
    expect(queryClient.getQueryData(appointmentsKeys.detail('appt-1'))).toEqual(APPOINTMENT);
    expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith('appt-1', NEW_SLOT.id, 'test-token');
  });

  it('reschedules successfully and shows the new time', async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT]);
    vi.mocked(appointmentsService.getDoctorProfile).mockResolvedValue(DOCTOR);
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([NEW_SLOT]);
    vi.mocked(appointmentsService.rescheduleAppointment).mockResolvedValue(
      makeAppointment({ ...NEW_SLOT, status: 'booked' }),
    );

    renderPage({ queryClient });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reschedule' }));
    await user.click(await screen.findByRole('button', { name: `${formatSlotDateTime(NEW_SLOT)}` }));
    await user.click(screen.getByRole('button', { name: 'Review change' }));
    await user.click(screen.getByRole('button', { name: 'Confirm reschedule' }));

    expect(await screen.findByText(`Your appointment is now ${formatSlotDateTime(NEW_SLOT)}.`)).toBeInTheDocument();
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.list }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.detail('appt-1') });
    expect(queryClient.getQueryData(appointmentsKeys.detail('appt-1'))).toHaveProperty('id', 'appt-1');
  });

  it('does not claim the appointment is missing when the id is not the patient\'s', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT]);

    render(
      <Routes>
        <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
      </Routes>,
      { route: '/appointments/not-theirs' },
    );

    expect(await screen.findByText(/couldn.t find that appointment/i)).toBeInTheDocument();
    expect(appointmentsService.getDoctorProfile).not.toHaveBeenCalled();
    expect(appointmentsService.getOpenSlots).not.toHaveBeenCalled();
    expect(appointmentsService.rescheduleAppointment).not.toHaveBeenCalled();
  });

  it('separates "we couldn\'t load it" from "you have none"', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockRejectedValue(new ApiError('Service unavailable.', 503));

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/couldn.t load your appointment/i);
    expect(alert).toHaveTextContent(/Service unavailable\./);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByText(/no appointments/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn.t find that appointment/i)).not.toBeInTheDocument();
  });

  it('falls back to a labelled placeholder rather than inventing a clinician name', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT]);
    vi.mocked(appointmentsService.getDoctorProfile).mockRejectedValue(new ApiError('Not Found', 404));

    renderPage();

    expect(await screen.findByText('Your clinician')).toBeInTheDocument();
    expect(
      await screen.findByText(/the clinician.s name isn.t available on this deployment yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Dr\./)).not.toBeInTheDocument();
  });

  it('does not carry an open reschedule panel across appointment ids', async () => {
    const otherSlot = makeSlot('slot-other', isoInDays(9, 16));
    const other = makeAppointment(otherSlot, { id: 'appt-other' });
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([APPOINTMENT, other]);
    vi.mocked(appointmentsService.getDoctorProfile).mockResolvedValue(DOCTOR);
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([NEW_SLOT]);

    render(
      <>
        <Link to="/appointments/appt-other">open the other appointment</Link>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        </Routes>
      </>,
      { route: '/appointments/appt-1' },
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Reschedule' }));
    expect(await screen.findByRole('heading', { name: 'Reschedule this appointment' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'open the other appointment' }));

    expect(await screen.findByText(formatSlotDateTime(otherSlot))).toBeInTheDocument();
    // The panel (and any slot picked inside it) belongs to the previous
    // appointment — back/forward must not leave it sitting on this one.
    expect(screen.queryByRole('heading', { name: 'Reschedule this appointment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review change' })).not.toBeInTheDocument();
  });

  describe('visit-day queue states (care hub)', () => {
    beforeEach(() => {
      // The page reads the wall clock for "is this visit today", so the clock is
      // frozen to NOW. Only Date is faked — waitFor still runs on real timers.
      vi.useFakeTimers({ now: NOW.getTime(), toFake: ['Date'] });
      queueHook.mockReturnValue({
        data: QUEUE,
        error: null,
        isError: false,
        isFetching: false,
        dataUpdatedAt: NOW.getTime(),
      } as never);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('names the day and the time of the visit', async () => {
      vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment()]);

      renderAt('/patient/appointments/apt-1');

      expect(await screen.findByText(/today at \d{2}:\d{2}/i)).toBeInTheDocument();
      expect(screen.getByText(/scheduled until/i)).toBeInTheDocument();
    });

    it('shows the live queue on the day of the visit', async () => {
      vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment()]);

      renderAt('/patient/appointments/apt-1');

      expect(await screen.findByText(/2 people ahead of you/i)).toBeInTheDocument();
      expect(screen.getByText(/about 9 min \(estimate\)/i)).toBeInTheDocument();
    });

    it.each(['checked_in', 'in_progress'] as const)(
      'keeps the live queue visible for a visit that is %s',
      async (status) => {
        // The doctor-side flow added these two statuses to AppointmentStatus. A
        // patient already in the queue must not be told there is "nothing to
        // check in to".
        vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment({ status })]);

        renderAt('/patient/appointments/apt-1');

        expect(await screen.findByText(/2 people ahead of you/i)).toBeInTheDocument();
        expect(screen.queryByText(/nothing to check in to/i)).not.toBeInTheDocument();
      },
    );

    it('does not start reading the queue before the day of the visit', async () => {
      const later = appointment();
      later.availabilitySlot.startTime = new Date(NOW.getTime() + 26 * 60 * 60 * 1000).toISOString();
      vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([later]);

      renderAt('/patient/appointments/apt-1');

      expect(await screen.findByText(/check-in opens on the day of your visit/i)).toBeInTheDocument();
      expect(queueHook).not.toHaveBeenCalled();
    });

    it('says a cancelled visit has nothing to check in to', async () => {
      vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment({ status: 'cancelled' })]);

      renderAt('/patient/appointments/apt-1');

      expect(await screen.findByText(/was cancelled, so there is nothing to check in to/i)).toBeInTheDocument();
      expect(queueHook).not.toHaveBeenCalled();
    });

    it('explains an appointment id that is not on this account', async () => {
      vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment()]);

      renderAt('/patient/appointments/apt-999');

      expect(await screen.findByText(/couldn.t find that appointment/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to your care summary/i })).toHaveAttribute(
        'href',
        '/patient',
      );
    });

    it('surfaces a failed appointments request', async () => {
      vi.mocked(appointmentsService.listMyAppointments).mockRejectedValue(new ApiError('Appointment service is down.', 503));

      renderAt('/patient/appointments/apt-1');

      expect(await screen.findByText(/appointment service is down/i)).toBeInTheDocument();
    });
  });
});
