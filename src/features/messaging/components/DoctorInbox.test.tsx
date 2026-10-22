import { describe, expect, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { DoctorInbox } from './DoctorInbox';
import { useAuthStore } from '../../../store/auth-store';
import * as messagingService from '../../../services/messaging-service';
import type { DoctorMessageThread } from '../../../types/models';

vi.mock('../../../services/messaging-service');

const THREADS: DoctorMessageThread[] = [
  {
    id: 'thread-1',
    patientProfileId: 'pat-1',
    patientName: 'Ada Patient',
    lastMessageAt: '2026-01-01T09:00:00Z',
    unreadCount: 2,
    lastPreview: 'I have a question about my results',
    waitingMinutes: 45,
    closingSoon: false,
  },
  {
    id: 'thread-2',
    patientProfileId: 'pat-2',
    patientName: 'Ben Patient',
    lastMessageAt: '2026-01-01T08:30:00Z',
    unreadCount: 0,
    lastPreview: 'Thanks for the note',
    waitingMinutes: 10,
    closingSoon: true,
  },
];

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(messagingService.listThreads).mockResolvedValue({
    threads: THREADS,
    nextCursor: null,
  });
  vi.mocked(messagingService.markThreadRead).mockResolvedValue(undefined);
});

describe('DoctorInbox', () => {
  it('lists threads with unread counts, preview, and waiting time', async () => {
    render(<DoctorInbox />);

    await screen.findByText('Ada Patient');
    await screen.findByText('Ben Patient');
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByText(/question about my results/)).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
  });

  it('shows the total unread badge in the header', async () => {
    render(<DoctorInbox />);
    // Ada (2) + Ben (0) = 2
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('marks a thread read when Mark read is clicked', async () => {
    render(<DoctorInbox />);
    const user = userEvent.setup();

    await screen.findByText('Ada Patient');
    await user.click(screen.getByRole('button', { name: /mark read/i }));

    await waitFor(() => {
      expect(messagingService.markThreadRead).toHaveBeenCalledWith(
        'thread-1',
        'test-token',
      );
    });
  });

  it('filters to unread threads only', async () => {
    vi.mocked(messagingService.listThreads).mockResolvedValueOnce({
      threads: [THREADS[0]],
      nextCursor: null,
    });

    render(<DoctorInbox />);
    const user = userEvent.setup();

    await screen.findByText('Ada Patient');
    await user.click(screen.getByRole('button', { name: /unread only/i }));

    await waitFor(() => {
      expect(messagingService.listThreads).toHaveBeenCalledWith(
        { filter: 'unread', cursor: null, limit: 10 },
        'test-token',
        expect.any(AbortSignal),
      );
    });
  });
});
