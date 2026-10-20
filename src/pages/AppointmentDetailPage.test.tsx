import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppointmentDetailPage } from './AppointmentDetailPage';
import * as appointmentsService from '../services/appointments-service';
import { ApiError } from '../services/api-client';
import { useAuthStore } from '../store/auth-store';
import type { PatientAppointment, AppointmentQueue } from '../types/models';

vi.mock('../services/appointments-service');

// The queue hook owns a poll timer, so the page test drives it directly: what
// is being proved here is which *page states* mount a live queue at all.
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

const NOW = new Date('2026-10-16T12:00:00Z');

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

const QUEUE: AppointmentQueue = {
  appointmentId: 'apt-1',
  phase: 'waiting',
  peopleAhead: 2,
  estimatedWaitMinutes: 9,
  checkInOpensAt: null,
  checkedInAt: '2026-10-16T11:40:00Z',
};

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/patient/appointments/:appointmentId" element={<AppointmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AppointmentDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.listMyAppointments).mockReset();
    // The page reads the wall clock for "is this visit today", so the clock is
    // frozen to NOW. Only Date is faked — waitFor still runs on real timers.
    vi.useFakeTimers({ now: NOW.getTime(), toFake: ['Date'] });
    queueHook.mockReset();
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

    expect(await screen.findByText(/cannot find that appointment/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to your care summary/i })).toHaveAttribute(
      'href',
      '/patient',
    );
  });

  it('surfaces a failed appointments request', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockRejectedValue(new ApiError('PatientAppointment service is down.', 503));

    renderAt('/patient/appointments/apt-1');

    expect(await screen.findByText(/appointment service is down/i)).toBeInTheDocument();
  });
});
