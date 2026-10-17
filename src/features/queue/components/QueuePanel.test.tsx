import { describe, expect, it, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { QueuePanel } from './QueuePanel';
import { useAuthStore } from '../../../store/auth-store';
import * as queueService from '../../../services/queue-service';
import type { QueueEntry, Appointment } from '../../../types/models';

vi.mock('../../../services/queue-service');

const QUEUE: QueueEntry[] = [
  {
    appointmentId: 'appt-1',
    patientProfileId: 'pat-1',
    fullName: 'Ada Patient',
    checkedInAt: '2026-01-01T09:05:00Z',
    queuePosition: 1,
    status: 'checked_in',
  },
  {
    appointmentId: 'appt-2',
    patientProfileId: 'pat-2',
    fullName: 'Ben Patient',
    checkedInAt: '2026-01-01T09:10:00Z',
    queuePosition: 2,
    status: 'checked_in',
  },
];

const APPOINTMENTS: Appointment[] = [
  { id: 'appt-1', doctorProfileId: 'doc-1', patientProfileId: 'pat-1', patientName: 'Ada Patient', startsAt: '2026-01-01T09:00:00Z', endsAt: '2026-01-01T09:30:00Z', status: 'checked_in' },
  { id: 'appt-2', doctorProfileId: 'doc-1', patientProfileId: 'pat-2', patientName: 'Ben Patient', startsAt: '2026-01-01T09:15:00Z', endsAt: '2026-01-01T09:45:00Z', status: 'checked_in' },
];

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(queueService.listTodayAppointments).mockResolvedValue(APPOINTMENTS);
  vi.mocked(queueService.listQueue).mockResolvedValue(QUEUE);
  vi.mocked(queueService.getRunningDelay).mockResolvedValue({
    computedDelayMin: 5,
    manualOverrideMin: null,
    effectiveDelayMin: 5,
  });
  vi.mocked(queueService.startVisit).mockResolvedValue({ ...APPOINTMENTS[0], status: 'in_progress' as const, startedAt: '2026-01-01T09:06:00Z' });
  vi.mocked(queueService.completeVisit).mockResolvedValue({ ...APPOINTMENTS[0], status: 'completed' as const, completedAt: '2026-01-01T09:20:00Z' });
  vi.mocked(queueService.updateRunningDelay).mockResolvedValue({
    computedDelayMin: 5,
    manualOverrideMin: 10,
    effectiveDelayMin: 15,
  });
});

describe('QueuePanel', () => {
  it('lists checked-in patients in queue order with Start/Complete actions', async () => {
    render(<QueuePanel />);

    await screen.findByText('Ada Patient');
    await screen.findByText('Ben Patient');
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start/i })).toHaveLength(2);
  });

  it('shows the computed running delay', async () => {
    render(<QueuePanel />);
    expect(await screen.findByText('5 min')).toBeInTheDocument();
  });

  it('starts a visit optimistically and offers undo', async () => {
    render(<QueuePanel />);
    const user = userEvent.setup();

    await screen.findByText('Ada Patient');
    const startButtons = screen.getAllByRole('button', { name: /start/i });
    await user.click(startButtons[0]);

    // Optimistic: status flips to In progress immediately.
    expect(await screen.findByText(/in progress/i)).toBeInTheDocument();
    // Undo toast is offered while the window is open.
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    // The deferred API call fires once the undo window elapses.
    await waitFor(
      () => {
        expect(queueService.startVisit).toHaveBeenCalledWith('appt-1', 'test-token');
      },
      { timeout: 6000 },
    );
  });

  it('completes an in-progress visit', async () => {
    const inProgress = [
      { ...QUEUE[0], status: 'in_progress' as const },
      QUEUE[1],
    ];
    const startedAppt = { ...APPOINTMENTS[0], status: 'in_progress' as const };
    vi.mocked(queueService.listQueue).mockResolvedValue(inProgress);
    vi.mocked(queueService.listTodayAppointments).mockResolvedValue([startedAppt, APPOINTMENTS[1]]);

    render(<QueuePanel />);
    const user = userEvent.setup();

    await screen.findByText(/in progress/i);
    await user.click(screen.getByRole('button', { name: /complete/i }));

    expect(await screen.findByText(/completed/i)).toBeInTheDocument();
    await waitFor(
      () => {
        expect(queueService.completeVisit).toHaveBeenCalledWith('appt-1', 'test-token');
      },
      { timeout: 6000 },
    );
  });

  it('shows no patients when the queue is empty', async () => {
    vi.mocked(queueService.listQueue).mockResolvedValue([]);
    render(<QueuePanel />);
    expect(await screen.findByText(/no checked-in patients yet/i)).toBeInTheDocument();
  });
});
