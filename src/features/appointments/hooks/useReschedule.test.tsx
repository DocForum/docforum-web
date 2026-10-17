import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../../../services/api-client';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import type { Appointment } from '../../../types/models';
import { createQueryClient, render, screen, waitFor } from '../../../test/render';
import { appointmentsKeys } from './useAppointments';
import { useReschedule } from './useReschedule';

vi.mock('../../../services/appointments-service');

const APPOINTMENT: Appointment = {
  id: 'appt-1',
  patientProfileId: 'pp-1',
  doctorProfileId: 'dp-1',
  availabilitySlotId: 'slot-1',
  status: 'scheduled',
  origin: 'direct_booking',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  availabilitySlot: {
    id: 'slot-1',
    doctorProfileId: 'dp-1',
    status: 'booked',
    startTime: '2026-11-20T09:00:00.000Z',
    endTime: '2026-11-20T09:30:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
};

const RESCHEDULED: Appointment = {
  ...APPOINTMENT,
  availabilitySlotId: 'slot-2',
  availabilitySlot: {
    ...APPOINTMENT.availabilitySlot,
    id: 'slot-2',
    status: 'booked',
    startTime: '2026-11-21T14:00:00.000Z',
    endTime: '2026-11-21T14:30:00.000Z',
  },
};

function Probe({ appointmentId }: { appointmentId: string }) {
  const mutation = useReschedule(appointmentId);

  return (
    <div>
      <button type="button" onClick={() => mutation.mutate({ newSlotId: 'slot-2' })}>
        Move it
      </button>
      <span data-testid="status">{mutation.status}</span>
    </div>
  );
}

describe('useReschedule', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.rescheduleAppointment).mockReset();
  });

  it('invalidates both the list and the detail cache on success', async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(appointmentsService.rescheduleAppointment).mockResolvedValue(RESCHEDULED);

    render(<Probe appointmentId={APPOINTMENT.id} />, { queryClient });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move it' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.list }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.detail(APPOINTMENT.id) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.slotsRoot });

    expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith(APPOINTMENT.id, 'slot-2', 'test-token');
    // The server's row lands in the detail cache straight away…
    expect(queryClient.getQueryData(appointmentsKeys.detail(APPOINTMENT.id))).toEqual(RESCHEDULED);
    // …and the list is refetched rather than emptied.
    expect(queryClient.getQueryData(appointmentsKeys.list)).toBeUndefined();
    expect(await screen.findByTestId('status')).toHaveTextContent('success');
  });

  it('keeps the appointment untouched on 409 and refreshes only the slots', async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData(appointmentsKeys.list, [APPOINTMENT]);
    queryClient.setQueryData(appointmentsKeys.detail(APPOINTMENT.id), APPOINTMENT);
    vi.mocked(appointmentsService.rescheduleAppointment).mockRejectedValue(
      new ApiError('This slot is no longer available.', 409),
    );

    render(<Probe appointmentId={APPOINTMENT.id} />, { queryClient });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move it' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.slotsRoot }));

    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: appointmentsKeys.list });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: appointmentsKeys.detail(APPOINTMENT.id) });
    // The cached appointment is still there, byte for byte — no optimistic
    // removal, no reset, no empty list mid-flow.
    expect(queryClient.getQueryData(appointmentsKeys.list)).toEqual([APPOINTMENT]);
    expect(queryClient.getQueryData(appointmentsKeys.detail(APPOINTMENT.id))).toEqual(APPOINTMENT);
    expect(await screen.findByTestId('status')).toHaveTextContent('error');
  });

  it('does not touch the cache at all for a failure that is not a slot conflict', async () => {
    const queryClient = createQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(appointmentsService.rescheduleAppointment).mockRejectedValue(new ApiError('Server fell over.', 500));

    render(<Probe appointmentId={APPOINTMENT.id} />, { queryClient });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move it' }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('error'));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
