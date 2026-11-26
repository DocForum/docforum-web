import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { StuckReferralsConsole } from './StuckReferralsConsole';
import { useStuckReferrals } from '../hooks/useStuckReferrals';
import type { StuckReferral } from '../../../types/models';

vi.mock('../hooks/useStuckReferrals');

const REFERRAL: StuckReferral = {
  id: 'ref-1',
  sourceConsultationId: 'consult-1',
  referringDoctorId: 'doc-gp',
  targetSpecialtyId: 'spec-cardio',
  targetDoctorId: null,
  parentReferralId: null,
  status: 'pending',
  resultingAppointmentId: null,
  createdAt: '2026-11-01T08:00:00.000Z',
  updatedAt: '2026-11-01T08:00:00.000Z',
  stuckReason: 'doctor_inactive',
  targetSpecialty: { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' },
  referringDoctor: { id: 'doc-gp', fullName: 'Dr. Grace Park' },
  targetDoctor: null,
  chain: null,
};

const QUEUE = {
  data: { pages: [{ items: [REFERRAL], nextCursor: null }] },
  isLoading: false,
  error: null,
  isFetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  dataUpdatedAt: Date.parse('2026-11-02T08:00:00.000Z'),
};

describe('StuckReferralsConsole in Spanish (#249)', () => {
  it('renders the console chrome, filters and card copy from the Spanish catalogue', () => {
    vi.mocked(useStuckReferrals).mockReturnValue(QUEUE as never);

    renderWithProviders(<StuckReferralsConsole />, {
      locale: 'es',
      route: '/admin/referrals',
    });

    expect(screen.getByRole('heading', { name: 'Derivaciones atascadas' })).toBeInTheDocument();
    expect(screen.getByText('Pendientes desde hace al menos')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filtrar por motivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Todas/ })).toBeInTheDocument();
    expect(screen.getAllByText('Médico inactivo').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Reasignar' })).toBeInTheDocument();
    expect(screen.queryByText('Stuck referrals')).not.toBeInTheDocument();
  });

  it('translates the reason filter labels and waiting age', () => {
    vi.mocked(useStuckReferrals).mockReturnValue(QUEUE as never);

    renderWithProviders(<StuckReferralsConsole />, {
      locale: 'es',
      route: '/admin/referrals',
    });

    expect(screen.getByRole('button', { name: /Sin médico/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bucle detectado/ })).toBeInTheDocument();
    expect(screen.getByText(/^Pendiente desde hace/)).toBeInTheDocument();
    // Raw API tokens must never be the visible label.
    expect(screen.queryByText('doctor_inactive')).not.toBeInTheDocument();
  });
});
