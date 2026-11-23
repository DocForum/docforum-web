import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { render, screen } from '../test/render';
import { DoctorReferralsPage } from './DoctorReferralsPage';
import { useAuthStore } from '../store/auth-store';
import * as referralsService from '../services/referrals-service';
import type { SentReferral } from '../types/models';

vi.mock('../services/referrals-service');

const SENT: SentReferral = {
  id: 'ref-sent-page',
  status: 'pending',
  targetDoctorId: 'doc-1',
  targetSpecialtyId: 'spc-cardio',
  targetDoctor: { id: 'doc-1', fullName: 'Dr. Cora Sample (fake)' },
  targetSpecialty: { id: 'spc-cardio', name: 'Cardiology', slug: 'cardiology' },
  referringDoctorNotifiedAt: null,
  loopFlaggedAt: null,
  loopFlagReason: null,
  noShowCount: 0,
  expiredAt: null,
  expiredReason: null,
  resultingAppointmentId: null,
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
};

function renderAt(path: string) {
  return render(
    <Routes>
      <Route path="/doctor/referrals/*" element={<DoctorReferralsPage />} />
    </Routes>,
    { route: path },
  );
}

describe('DoctorReferralsPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(referralsService.listCreatedReferrals).mockReset();
    vi.mocked(referralsService.listReferrals).mockReset();
  });

  it('offers Received and Sent views side by side', () => {
    vi.mocked(referralsService.listReferrals).mockResolvedValue({ items: [], nextCursor: null });

    renderAt('/doctor/referrals');

    const nav = screen.getByRole('navigation', { name: 'Referral views' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Received' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sent' })).toHaveAttribute('href', '/doctor/referrals/sent');
  });

  it('renders the Sent view at /doctor/referrals/sent without treating "sent" as a referral id', async () => {
    vi.mocked(referralsService.listCreatedReferrals).mockResolvedValue([SENT]);

    renderAt('/doctor/referrals/sent');

    expect(await screen.findByRole('heading', { name: /referrals i've sent/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sent' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByText('Dr. Cora Sample (fake)')).toBeInTheDocument();
  });
});
