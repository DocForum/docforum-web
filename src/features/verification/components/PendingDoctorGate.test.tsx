import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import { PendingDoctorGate } from './PendingDoctorGate';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as doctorService from '../../../services/doctor-service';
import type { DoctorProfile } from '../../../types/models';

vi.mock('../../../services/doctor-service');

function profile(overrides: Partial<DoctorProfile> = {}): DoctorProfile {
  return { id: 'dp-1', userId: 'u-1', fullName: 'Dr. Amara Okafor', verificationStatus: 'pending', ...overrides };
}

function renderGate(verificationPath?: string) {
  return render(
    <PendingDoctorGate verificationPath={verificationPath}>
      <div>
        <h2>Availability calendar</h2>
        <p>Patient-facing consultation tools.</p>
      </div>
    </PendingDoctorGate>,
  );
}

describe('PendingDoctorGate', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(doctorService.getMyDoctorProfile).mockReset();
  });

  it('shows the doctor area once the profile is verified', async () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockResolvedValue(profile({ verificationStatus: 'verified' }));

    renderGate();

    expect(await screen.findByText('Availability calendar')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /verification application/i })).toBeNull();
  });

  it('hides the doctor area and points at the application while pending', async () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockResolvedValue(profile({ verificationStatus: 'pending' }));

    renderGate();

    expect(await screen.findByText(/finish your verification application/i)).toBeInTheDocument();
    expect(screen.queryByText('Availability calendar')).toBeNull();
    expect(screen.getByRole('link', { name: /go to my verification application/i })).toHaveAttribute(
      'href',
      '/doctor/verification',
    );
    expect(screen.getByText('Application pending')).toBeInTheDocument();
  });

  it('says why a rejected application is closed and still offers the way back', async () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockResolvedValue(
      profile({ verificationStatus: 'rejected' }),
    );

    render(
      <PendingDoctorGate rejectionReason="The identity document does not match the name on the account.">
        <div>
          <h2>Availability calendar</h2>
        </div>
      </PendingDoctorGate>,
    );

    expect(await screen.findByText(/application rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/identity document does not match/i)).toBeInTheDocument();
    expect(screen.queryByText('Availability calendar')).toBeNull();
  });

  it('gives next steps when a rejection carries no reason', async () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockResolvedValue(
      profile({ verificationStatus: 'rejected' }),
    );

    renderGate();

    expect(await screen.findByText(/no reason was recorded/i)).toBeInTheDocument();
  });

  it('accepts a status from the caller instead of fetching again', () => {
    render(
      <PendingDoctorGate status="pending" verificationPath="/doctor/apply">
        <div>
          <h2>Availability calendar</h2>
        </div>
      </PendingDoctorGate>,
    );

    expect(screen.getByText(/finish your verification application/i)).toBeInTheDocument();
    expect(doctorService.getMyDoctorProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/doctor/apply');
  });

  // A freshly signed-up doctor can have no profile row at all: `GET /doctors/me`
  // answers 404. That is "nothing verified yet", not a broken page.
  it('treats a missing profile row as an application still to finish', async () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockRejectedValue(new ApiError('Doctor profile not found.', 404));

    renderGate();

    expect(await screen.findByText(/finish your verification application/i)).toBeInTheDocument();
    expect(screen.queryByText('Availability calendar')).toBeNull();
  });

  it('does not flash the doctor area while the status is still loading', () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockReturnValue(new Promise<DoctorProfile>(() => {}));

    renderGate();

    expect(screen.getByText(/checking your verification status/i)).toBeInTheDocument();
    expect(screen.queryByText('Availability calendar')).toBeNull();
  });

  it('fails closed when the status cannot be read', async () => {
    vi.mocked(doctorService.getMyDoctorProfile).mockRejectedValue(new Error('Offline.'));

    renderGate();

    expect(await screen.findByText(/could not read your application/i)).toBeInTheDocument();
    expect(screen.queryByText('Availability calendar')).toBeNull();
    expect(screen.getByRole('link', { name: /open my verification application/i })).toBeInTheDocument();
  });
});
