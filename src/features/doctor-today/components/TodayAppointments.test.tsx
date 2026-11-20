import { beforeEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../../test/render';
import { TodayAppointments } from './TodayAppointments';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as queueService from '../../../services/queue-service';
import type { Appointment } from '../../../types/models';

vi.mock('../../../services/queue-service');

const ADA: Appointment = {
  id: 'appt-ada',
  doctorProfileId: 'doc-1',
  patientProfileId: 'pat-1',
  patientName: 'Ada Patient',
  startsAt: '2026-01-01T09:00:00Z',
  endsAt: '2026-01-01T09:30:00Z',
  status: 'scheduled',
  reason: 'Demo follow-up (fake)',
  referral: {
    id: 'ref-1',
    targetSpecialtyName: 'Cardiology',
    priorNoShows: 0,
  },
};

const FUTURE: Appointment = {
  id: 'appt-future',
  doctorProfileId: 'doc-1',
  patientProfileId: 'pat-2',
  patientName: 'Ben Future',
  startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
  status: 'scheduled',
};

const COMPLETED: Appointment = {
  id: 'appt-done',
  doctorProfileId: 'doc-1',
  patientProfileId: 'pat-3',
  patientName: 'Cleo Done',
  startsAt: '2026-01-01T08:00:00Z',
  endsAt: '2026-01-01T08:30:00Z',
  status: 'completed',
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(queueService.listTodayAppointments).mockReset();
  vi.mocked(queueService.listTodayAppointments).mockResolvedValue([ADA, FUTURE, COMPLETED]);
  vi.mocked(queueService.updateAppointmentStatus).mockReset();
  vi.mocked(queueService.updateAppointmentStatus).mockResolvedValue({ ...ADA, status: 'no_show' });
});

describe('TodayAppointments — no-show and cancel', () => {
  it("lists the day's appointments and only offers status actions for scheduled visits", async () => {
    render(<TodayAppointments />);

    expect(await screen.findByText('Ada Patient')).toBeInTheDocument();
    expect(screen.getByText('Ben Future')).toBeInTheDocument();
    expect(screen.getByText('Cleo Done')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Mark Ada Patient as no-show' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Cancel Ada Patient's visit" })).toBeInTheDocument();

    // Completed visits are read-only: no no-show/cancel actions.
    expect(screen.queryByRole('button', { name: /Cleo Done/i })).not.toBeInTheDocument();
  });

  it('does not offer no-show before the appointment start time', async () => {
    render(<TodayAppointments />);

    const noShow = await screen.findByRole('button', { name: 'Mark Ben Future as no-show' });
    expect(noShow).toBeDisabled();
    expect(noShow).toHaveAttribute('title', expect.stringContaining('start time'));
    expect(screen.getByText(/no-show after/i)).toBeInTheDocument();
  });

  it('confirms a no-show, calls the status endpoint and refreshes the list', async () => {
    const user = userEvent.setup();
    vi.mocked(queueService.listTodayAppointments)
      .mockResolvedValueOnce([ADA, FUTURE, COMPLETED])
      .mockResolvedValue([{ ...ADA, status: 'no_show' }, FUTURE, COMPLETED]);

    render(<TodayAppointments />);
    await user.click(await screen.findByRole('button', { name: 'Mark Ada Patient as no-show' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/recorded as a no-show/i)).toBeInTheDocument();
    // The linked referral consequence is spelled out before confirming.
    expect(within(dialog).getByText(/referral goes back to pending/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Mark as no-show' }));

    await waitFor(() => {
      expect(queueService.updateAppointmentStatus).toHaveBeenCalledWith(
        'appt-ada',
        'no_show',
        'test-token',
      );
    });
    expect(await screen.findByText('No-show')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says a referral will expire after repeated no-shows', async () => {
    vi.mocked(queueService.listTodayAppointments).mockResolvedValue([
      { ...ADA, referral: { ...ADA.referral!, priorNoShows: 2 } },
    ]);
    const user = userEvent.setup();

    render(<TodayAppointments />);
    await user.click(await screen.findByRole('button', { name: 'Mark Ada Patient as no-show' }));

    expect(screen.getByRole('dialog')).toHaveTextContent(/will expire after this one/i);
  });

  it('confirms a cancellation and explains the referral returns to pending', async () => {
    const user = userEvent.setup();
    vi.mocked(queueService.updateAppointmentStatus).mockResolvedValue({ ...ADA, status: 'cancelled' });

    render(<TodayAppointments />);
    await user.click(await screen.findByRole('button', { name: "Cancel Ada Patient's visit" }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/will be cancelled/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/goes back to pending/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel visit' }));

    await waitFor(() => {
      expect(queueService.updateAppointmentStatus).toHaveBeenCalledWith(
        'appt-ada',
        'cancelled',
        'test-token',
      );
    });
  });

  it('explains a 409 conflict when the visit is no longer scheduled', async () => {
    const user = userEvent.setup();
    vi.mocked(queueService.updateAppointmentStatus).mockRejectedValue(
      new ApiError('Mock API: appointment is no longer scheduled', 409),
    );

    render(<TodayAppointments />);
    await user.click(await screen.findByRole('button', { name: 'Mark Ada Patient as no-show' }));
    await user.click(screen.getByRole('button', { name: 'Mark as no-show' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/no longer scheduled/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
