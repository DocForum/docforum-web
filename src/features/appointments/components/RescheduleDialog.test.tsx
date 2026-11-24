import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../services/api-client';
import * as appointmentsService from '../../../services/appointments-service';
import { useAuthStore } from '../../../store/auth-store';
import type { AvailabilitySlot, PatientAppointment } from '../../../types/models';
import { createQueryClient, render, screen, waitFor, within } from '../../../test/render';
import { formatDayLabel, formatSlotDateTime, formatSlotRange } from '../slots';
import { appointmentsKeys } from '../hooks/useAppointments';
import { RescheduleDialog } from './RescheduleDialog';

vi.mock('../../../services/appointments-service');

/** A slot `days` out at a fixed UTC hour — always in the future, whatever day
 * the suite runs on. */
function makeSlot(id: string, days: number, hourUtc: number, minuteUtc = 0): AvailabilitySlot {
  const start = new Date(Date.now() + days * 86_400_000);
  start.setUTCHours(hourUtc, minuteUtc, 0, 0);
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    id,
    doctorProfileId: 'dp-1',
    status: 'open',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const SLOT_A = makeSlot('slot-a', 7, 9);
const SLOT_B = makeSlot('slot-b', 7, 10);
const SLOT_CURRENT = makeSlot('slot-current', 7, 11);

function makeAppointment(startIso: string): PatientAppointment {
  const end = new Date(Date.parse(startIso) + 30 * 60_000).toISOString();
  return {
    id: 'appt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-current',
    status: 'scheduled',
    origin: 'direct_booking',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    availabilitySlot: {
      id: 'slot-current',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: startIso,
      endTime: end,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  };
}

/** The appointment the patient actually holds — its slot is far enough out
 * that the 2-hour cutoff is open. */
const APPOINTMENT = makeAppointment(SLOT_CURRENT.startTime);
const ORIGINAL_TIME = formatSlotDateTime(APPOINTMENT.availabilitySlot);

function slotButtonName(slot: AvailabilitySlot): string {
  return `${formatDayLabel(slot.startTime)}, ${formatSlotRange(slot)}`;
}

async function pickAndReview(slot: AvailabilitySlot) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: slotButtonName(slot) }));
  await user.click(screen.getByRole('button', { name: 'Review change' }));
}

describe('RescheduleDialog', () => {
  let queryClient: QueryClient;
  let onClose: Mock;

  beforeEach(() => {
    queryClient = createQueryClient();
    onClose = vi.fn();
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.getOpenSlots).mockReset().mockResolvedValue([]);
    vi.mocked(appointmentsService.rescheduleAppointment).mockReset();
  });

  it("lists the same doctor's open times and never offers the current one", async () => {
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT_A, SLOT_B, SLOT_CURRENT]);

    render(<RescheduleDialog appointment={APPOINTMENT} onClose={onClose} />, { queryClient });

    expect(await screen.findByRole('button', { name: slotButtonName(SLOT_A) })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: slotButtonName(SLOT_B) })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: slotButtonName(SLOT_CURRENT) })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Review change' })).toBeDisabled();
    expect(appointmentsService.getOpenSlots).toHaveBeenCalledWith('dp-1');
  });

  it('confirms a move, calls the endpoint and shows the result', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT_A]);
    vi.mocked(appointmentsService.rescheduleAppointment).mockResolvedValue({
      ...APPOINTMENT,
      availabilitySlotId: SLOT_A.id,
      availabilitySlot: SLOT_A,
    });

    render(<RescheduleDialog appointment={APPOINTMENT} onClose={onClose} />, { queryClient });

    await pickAndReview(SLOT_A);
    expect(within(screen.getByText('Current time').closest('div')!).getByText(ORIGINAL_TIME)).toBeInTheDocument();
    expect(within(screen.getByText('New time').closest('div')!).getByText(formatSlotDateTime(SLOT_A))).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm reschedule' }));

    expect(await screen.findByText(`Your appointment is now ${formatSlotDateTime(SLOT_A)}.`)).toBeInTheDocument();
    expect(appointmentsService.rescheduleAppointment).toHaveBeenCalledWith('appt-1', SLOT_A.id, 'test-token');
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.list }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.detail('appt-1') });

    expect(onClose).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('explains a 409, keeps the original appointment and refreshes the slots', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT_A, SLOT_B]);
    vi.mocked(appointmentsService.rescheduleAppointment).mockRejectedValue(
      new ApiError('This slot is no longer available.', 409),
    );

    render(<RescheduleDialog appointment={APPOINTMENT} onClose={onClose} />, { queryClient });

    await pickAndReview(SLOT_A);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm reschedule' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/That time was just taken by someone else, so nothing changed/);
    expect(alert).toHaveTextContent(`Your appointment is still ${ORIGINAL_TIME}`);

    // Back on the picker, with a refetched list…
    expect(screen.getByRole('button', { name: 'Review change' })).toBeInTheDocument();
    await waitFor(() => expect(appointmentsService.getOpenSlots).toHaveBeenCalledTimes(2));

    // …and the appointment caches were deliberately left alone.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: appointmentsKeys.slotsRoot });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: appointmentsKeys.list });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: appointmentsKeys.detail('appt-1') });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an honest empty state rather than a blank picker', async () => {
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([]);

    render(<RescheduleDialog appointment={APPOINTMENT} onClose={onClose} />, { queryClient });

    expect(
      await screen.findByText(/No other times are open with this clinician right now/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review change' })).toBeDisabled();
  });

  it('disables the confirm button while the request is in flight', async () => {
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT_A]);
    let resolveRequest!: (value: PatientAppointment) => void;
    vi.mocked(appointmentsService.rescheduleAppointment).mockReturnValue(
      new Promise<PatientAppointment>((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(<RescheduleDialog appointment={APPOINTMENT} onClose={onClose} />, { queryClient });

    await pickAndReview(SLOT_A);
    const confirm = screen.getByRole('button', { name: 'Confirm reschedule' });
    await userEvent.setup().click(confirm);

    const pending = await screen.findByRole('button', { name: /Confirm reschedule/ });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');

    resolveRequest({ ...APPOINTMENT, availabilitySlotId: SLOT_A.id, availabilitySlot: SLOT_A });
    await screen.findByText(`Your appointment is now ${formatSlotDateTime(SLOT_A)}.`);
  });

  it('refuses at the confirm step if the appointment has entered the cutoff window', async () => {
    // Opens fine, but the appointment starts in 45 minutes — inside the
    // assumed 2-hour window (docforum-core#55/#56).
    const insideCutoff = makeAppointment(new Date(Date.now() + 45 * 60_000).toISOString());
    vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT_A]);

    render(<RescheduleDialog appointment={insideCutoff} onClose={onClose} />, { queryClient });

    await pickAndReview(SLOT_A);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm reschedule' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Rescheduling closes 2 hours before your appointment/);
    expect(appointmentsService.rescheduleAppointment).not.toHaveBeenCalled();
  });
});
