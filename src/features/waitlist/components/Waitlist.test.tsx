import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../../test/render';
import { JoinWaitlistDialog } from './JoinWaitlistDialog';
import { WaitlistManager } from './WaitlistManager';
import { WaitlistOfferBanner } from './WaitlistOfferBanner';
import { ApiError } from '../../../services/api-client';
import * as waitlistService from '../../../services/waitlist-service';
import type { WaitlistEntry, WaitlistOffer } from '../../../types/models';

vi.mock('../../../services/waitlist-service');

const SERVER_AHEAD_MS = 60 * 60_000;

function offer(overrides: Partial<WaitlistOffer> = {}): WaitlistOffer {
  const serverNow = new Date(Date.now() + SERVER_AHEAD_MS);
  return {
    id: 'offer-1',
    entryId: 'entry-1',
    doctorName: 'Dr Sam Specialist',
    specialtyName: 'Cardiology',
    startsAt: new Date(serverNow.getTime() + 24 * 60 * 60_000).toISOString(),
    endsAt: new Date(serverNow.getTime() + 24 * 60 * 60_000 + 30 * 60_000).toISOString(),
    expiresAt: new Date(serverNow.getTime() + 5_000).toISOString(),
    serverNow: serverNow.toISOString(),
    ...overrides,
  };
}

function entry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: 'entry-1',
    patientProfileId: 'pat-1',
    doctorId: 'doc-1',
    doctorName: 'Dr Sam Specialist',
    specialtyId: 'spec-cardio',
    specialtyName: 'Cardiology',
    preferredWindow: 'anytime',
    status: 'waiting',
    joinedAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    offer: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
    items: [entry()],
    serverNow: new Date().toISOString(),
  });
  vi.mocked(waitlistService.joinWaitlist).mockResolvedValue(entry());
  vi.mocked(waitlistService.updateWaitlistEntry).mockResolvedValue(entry({ preferredWindow: 'morning' }));
  vi.mocked(waitlistService.leaveWaitlist).mockResolvedValue(undefined);
  vi.mocked(waitlistService.acceptWaitlistOffer).mockResolvedValue({
    entry: entry({ status: 'booked' }),
    appointmentId: 'appt-7',
    requiresIntake: true,
  });
  vi.mocked(waitlistService.declineWaitlistOffer).mockResolvedValue({ entry: entry() });
});

describe('JoinWaitlistDialog', () => {
  it('joins with a preferred time window for the specialty', async () => {
    const user = userEvent.setup();
    render(<JoinWaitlistDialog specialty={{ id: 'spec-cardio', name: 'Cardiology' }} />, {
      role: 'patient',
    });

    await user.click(screen.getByRole('button', { name: /join waitlist/i }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText(/preferred time/i), 'morning');
    await user.click(within(dialog).getByRole('button', { name: /join waitlist/i }));

    await waitFor(() =>
      expect(waitlistService.joinWaitlist).toHaveBeenCalledWith(
        { doctorId: null, specialtyId: 'spec-cardio', preferredWindow: 'morning' },
        'test-patient-token',
      ),
    );
    expect(await screen.findByText(/you’re on the waitlist/i)).toBeInTheDocument();
  });
});

describe('WaitlistManager', () => {
  it('lists entries and saves an edited preferred window with the version it saw', async () => {
    const user = userEvent.setup();
    render(<WaitlistManager />, { role: 'patient' });

    expect(await screen.findByText('Dr Sam Specialist')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: /^save$/i });
    expect(save).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/preferred time/i), 'evening');
    await user.click(save);

    await waitFor(() =>
      expect(waitlistService.updateWaitlistEntry).toHaveBeenCalledWith(
        'entry-1',
        { preferredWindow: 'evening', expectedUpdatedAt: '2026-10-01T09:00:00.000Z' },
        'test-patient-token',
      ),
    );
  });

  it('confirms before leaving, then removes the entry', async () => {
    const user = userEvent.setup();
    render(<WaitlistManager />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /leave waitlist/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/release/i);
    await user.click(within(dialog).getByRole('button', { name: /leave waitlist/i }));

    await waitFor(() =>
      expect(waitlistService.leaveWaitlist).toHaveBeenCalledWith('entry-1', 'test-patient-token'),
    );
  });

  it('shows the empty state with a way forward', async () => {
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
      items: [],
      serverNow: new Date().toISOString(),
    });
    render(<WaitlistManager />, { role: 'patient' });

    expect(await screen.findByText(/you’re not on a waitlist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /find a doctor/i })).toHaveAttribute(
      'href',
      '/patient/search',
    );
  });
});

describe('WaitlistOfferBanner', () => {
  it('counts down against the server clock, not the device clock', async () => {
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
      items: [entry({ status: 'offer_pending', offer: offer() })],
      serverNow: new Date().toISOString(),
    });
    render(<WaitlistOfferBanner />, { role: 'patient' });

    expect(await screen.findByText(/a slot opened up/i)).toBeInTheDocument();
    // The offer expires 5s after the server clock, even though the device is
    // an hour behind that clock. Naive local-time maths would show 1:00:05.
    expect(screen.getByRole('timer')).toHaveTextContent(/0:0[3-5]/);
  });

  it('shows an expired offer gracefully and keeps the waitlist entry', async () => {
    const expired = offer({
      expiresAt: new Date(Date.now() + SERVER_AHEAD_MS - 1_000).toISOString(),
    });
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
      items: [entry({ status: 'waiting', offer: expired })],
      serverNow: new Date().toISOString(),
    });
    render(<WaitlistOfferBanner />, { role: 'patient' });

    expect(await screen.findByText(/this offer expired/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see my waitlists/i })).toHaveAttribute(
      'href',
      '/patient/waitlist',
    );
    expect(screen.queryByRole('button', { name: /accept this slot/i })).not.toBeInTheDocument();
  });

  it('accepts the offer and says which appointment was created, including the intake step', async () => {
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
      items: [entry({ status: 'offer_pending', offer: offer() })],
      serverNow: new Date().toISOString(),
    });
    const user = userEvent.setup();
    render(<WaitlistOfferBanner />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /accept this slot/i }));

    await waitFor(() =>
      expect(waitlistService.acceptWaitlistOffer).toHaveBeenCalledWith('offer-1', 'test-patient-token'),
    );
    expect(await screen.findByText('Appointment booked')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /finish your intake/i })).toHaveAttribute(
      'href',
      '/patient/appointments/appt-7/intake',
    );
    expect(screen.getByRole('link', { name: /view the appointment/i })).toHaveAttribute(
      'href',
      '/appointments/appt-7',
    );
  });

  it('declines the offer without booking', async () => {
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
      items: [entry({ status: 'offer_pending', offer: offer() })],
      serverNow: new Date().toISOString(),
    });
    const user = userEvent.setup();
    render(<WaitlistOfferBanner />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /^decline$/i }));

    await waitFor(() =>
      expect(waitlistService.declineWaitlistOffer).toHaveBeenCalledWith(
        'offer-1',
        'test-patient-token',
      ),
    );
    expect(waitlistService.acceptWaitlistOffer).not.toHaveBeenCalled();
  });

  it('explains a lapsed hold when accepting comes back as a conflict', async () => {
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue({
      items: [entry({ status: 'offer_pending', offer: offer() })],
      serverNow: new Date().toISOString(),
    });
    vi.mocked(waitlistService.acceptWaitlistOffer).mockRejectedValue(new ApiError('Gone', 409));
    const user = userEvent.setup();
    render(<WaitlistOfferBanner />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /accept this slot/i }));

    expect(await screen.findByText(/that slot was taken just before you accepted/i)).toBeInTheDocument();
    expect(screen.queryByText('Appointment booked')).not.toBeInTheDocument();
  });

  it('renders nothing when no offer is open', async () => {
    render(<WaitlistOfferBanner />, { role: 'patient' });

    await waitFor(() => expect(waitlistService.listMyWaitlist).toHaveBeenCalled());
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByText(/a slot opened up/i)).not.toBeInTheDocument();
  });
});
