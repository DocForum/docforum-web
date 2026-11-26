import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import type { CancellationPolicy, CancelledAppointment, PatientAppointment } from '../../../types/models';
import { render, screen, waitFor } from '../../../test/render';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';

vi.mock('../../../services/appointments-service');

const POLICY: CancellationPolicy = {
  lateCancellationCutoffMinutes: 120,
  releaseSlotBeforeCutoff: true,
  releaseSlotAfterCutoff: true,
  recordLateCancellation: true,
  referralHandling: 'returns_to_referral_queue',
};

function appointmentIn(minutes: number, origin: PatientAppointment['origin'] = 'direct_booking'): PatientAppointment {
  const start = new Date(Date.now() + minutes * 60_000);
  return {
    id: 'apt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-1',
    status: 'scheduled',
    origin,
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 30 * 60_000).toISOString(),
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(appointmentsService.getCancellationPolicy).mockResolvedValue(POLICY);
});

describe('CancelAppointmentDialog (#15)', () => {
  it('states the on-time policy and the referral consequence before confirming', async () => {
    render(<CancelAppointmentDialog appointment={appointmentIn(3 * 24 * 60, 'referral')} onClose={() => {}} />);

    const policy = await screen.findByTestId('policy-outcome');
    expect(policy).toHaveTextContent(/not a late cancellation/i);
    expect(policy).toHaveTextContent(/slot is released/i);
    expect(policy).toHaveTextContent(/back to the referral queue/i);
  });

  it('states the late-cancellation outcome after the cutoff', async () => {
    render(<CancelAppointmentDialog appointment={appointmentIn(45)} onClose={() => {}} />);

    const policy = await screen.findByTestId('policy-outcome');
    expect(policy).toHaveTextContent(/inside the 2 hours cutoff/i);
    expect(policy).toHaveTextContent(/late cancellation/i);
    expect(policy).not.toHaveTextContent(/not a late cancellation/i);
  });

  it('requires a reason, and only sends one cancel request when confirmed twice', async () => {
    const user = userEvent.setup();
    let resolveCancel!: (value: CancelledAppointment) => void;
    vi.mocked(appointmentsService.cancelAppointment).mockImplementation(
      () => new Promise<CancelledAppointment>((resolve) => {
        resolveCancel = resolve;
      }),
    );
    const appointment = appointmentIn(3 * 24 * 60);

    render(<CancelAppointmentDialog appointment={appointment} onClose={() => {}} />);
    await screen.findByTestId('policy-outcome');

    const confirm = screen.getByRole('button', { name: /yes, cancel/i });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole('radio', { name: /something else came up/i }));
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    await user.click(confirm);

    expect(appointmentsService.cancelAppointment).toHaveBeenCalledTimes(1);
    expect(appointmentsService.cancelAppointment).toHaveBeenCalledWith(
      'apt-1',
      expect.objectContaining({ reason: 'schedule_conflict', expectedUpdatedAt: '2026-10-01T00:00:00.000Z' }),
      'test-token',
    );

    resolveCancel({ ...appointment, status: 'cancelled' });
    await waitFor(() => expect(screen.getByText(/appointment cancelled/i)).toBeInTheDocument());
  });
});
