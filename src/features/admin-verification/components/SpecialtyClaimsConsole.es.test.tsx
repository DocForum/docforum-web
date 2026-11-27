import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { SpecialtyClaimsConsole } from './SpecialtyClaimsConsole';
import { useSpecialtyCatalog, useSpecialtyClaims } from '../hooks/useSpecialtyClaims';
import type { SpecialtyClaim } from '../../../types/models';

vi.mock('../hooks/useSpecialtyClaims');

const CLAIM: SpecialtyClaim = {
  id: 'dsc-1',
  doctorId: 'doc-gp',
  doctor: { id: 'doc-gp', fullName: 'Dr. Grace Park' },
  specialtyId: 'spec-cardio',
  specialty: { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' },
  status: 'pending',
  credential: {
    id: 'crd-1',
    fileName: 'board-certification-demo.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245_760,
    uploadedAt: '2026-11-01T08:00:00.000Z',
  },
  rejectionReason: null,
  reviewedById: null,
  reviewedByName: null,
  reviewedAt: null,
  updatedAt: '2026-11-01T08:00:00.000Z',
  createdAt: '2026-11-01T08:00:00.000Z',
};

const QUEUE = {
  data: { pages: [{ items: [CLAIM], nextCursor: null }] },
  isLoading: false,
  error: null,
  isFetching: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  dataUpdatedAt: Date.parse('2026-11-02T08:00:00.000Z'),
};

const CATALOG = { data: [], isLoading: false, error: null };

describe('SpecialtyClaimsConsole in Spanish (#249)', () => {
  it('renders the console chrome, filters and claim card from the Spanish catalogue', () => {
    vi.mocked(useSpecialtyClaims).mockReturnValue(QUEUE as never);
    vi.mocked(useSpecialtyCatalog).mockReturnValue(CATALOG as never);

    renderWithProviders(<SpecialtyClaimsConsole />, {
      locale: 'es',
      route: '/admin/verification',
    });

    expect(
      screen.getByRole('heading', { name: 'Reclamaciones de especialidad' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Especialidad')).toBeInTheDocument();
    expect(screen.getByText('Todas las especialidades')).toBeInTheDocument();
    expect(screen.getByText('Reclamada desde hace al menos')).toBeInTheDocument();
    expect(screen.getByText('1 reclamación pendiente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver documento' })).toBeInTheDocument();
    expect(screen.queryByText('Specialty claims')).not.toBeInTheDocument();
  });

  it('translates the approve and reject actions', () => {
    vi.mocked(useSpecialtyClaims).mockReturnValue(QUEUE as never);
    vi.mocked(useSpecialtyCatalog).mockReturnValue(CATALOG as never);

    renderWithProviders(<SpecialtyClaimsConsole />, {
      locale: 'es',
      route: '/admin/verification',
    });

    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
    // The raw API token is never shown; the translated claim age is.
    expect(screen.getByText(/^Reclamada hace/)).toBeInTheDocument();
    expect(screen.queryByText('pending')).not.toBeInTheDocument();
  });
});
