import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../../../test/render';
import { QueuePanel } from './QueuePanel';
import { useAuthStore } from '../../../store/auth-store';
import * as queueService from '../../../services/queue-service';
import type { QueueEntry } from '../../../types/models';

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
    status: 'in_progress',
  },
];

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(queueService.listQueue).mockResolvedValue(QUEUE);
  vi.mocked(queueService.listTodayAppointments).mockResolvedValue([]);
  vi.mocked(queueService.getRunningDelay).mockResolvedValue({
    computedDelayMin: 5,
    manualOverrideMin: null,
    effectiveDelayMin: 5,
  });
});

describe('QueuePanel accessibility (#90)', () => {
  it('has no detectable axe violations', async () => {
    const { container } = render(<QueuePanel />);
    await screen.findByText('Ada Patient');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('gives the queue table a caption and column headers', async () => {
    render(<QueuePanel />);
    await screen.findByText('Ada Patient');

    const table = screen.getByRole('table', { name: /checked-in patients in queue order/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Patient' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Ada Patient' })).toBeInTheDocument();
  });

  it('keeps a persistent polite live region for batched updates', async () => {
    render(<QueuePanel />);
    await screen.findByText('Ada Patient');

    const statusRegions = screen.getAllByRole('status');
    expect(statusRegions.length).toBeGreaterThan(0);
    expect(
      statusRegions.some((region) => region.getAttribute('aria-live') === 'polite'),
    ).toBe(true);
  });

  it('labels row actions with the patient name', async () => {
    render(<QueuePanel />);
    await screen.findByText('Ada Patient');
    expect(
      screen.getByRole('button', { name: /start visit for ada patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /complete visit for ben patient/i }),
    ).toBeInTheDocument();
  });
});
