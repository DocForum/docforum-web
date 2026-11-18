import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { SpecialtyClaimPicker } from './SpecialtyClaimPicker';
import { useAuthStore } from '../../../store/auth-store';
import * as verificationService from '../../../services/doctor-verification-service';
import type { ClaimItemStatus, DoctorSpecialtyClaim, Specialty } from '../../../types/models';

vi.mock('../../../services/doctor-verification-service');

const CARDIOLOGY: Specialty = { id: 'sp-1', name: 'Cardiology', slug: 'cardiology' };
const DERMATOLOGY: Specialty = { id: 'sp-2', name: 'Dermatology', slug: 'dermatology' };
const CATALOG = [CARDIOLOGY, DERMATOLOGY];

function claim(overrides: Partial<DoctorSpecialtyClaim> = {}): DoctorSpecialtyClaim {
  return {
    id: 'sc-1',
    doctorProfileId: 'dp-1',
    specialtyId: CARDIOLOGY.id,
    specialty: CARDIOLOGY,
    status: 'pending',
    rejectionReason: null,
    submittedAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
    ...overrides,
  };
}

const STATUS_ROWS: { status: ClaimItemStatus; label: string; rejected: boolean; withdrawable: boolean }[] = [
  { status: 'pending', label: 'Pending review', rejected: false, withdrawable: true },
  { status: 'verified', label: 'Verified', rejected: false, withdrawable: false },
  { status: 'rejected', label: 'Rejected', rejected: true, withdrawable: true },
];

function renderPicker(claims: readonly DoctorSpecialtyClaim[], props: Partial<{ isLoading: boolean; error: string | null }> = {}) {
  return render(
    <SpecialtyClaimPicker
      catalog={CATALOG}
      claims={claims}
      isLoading={props.isLoading ?? false}
      error={props.error ?? null}
    />,
  );
}

describe('SpecialtyClaimPicker', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(verificationService.createSpecialtyClaim).mockReset();
    vi.mocked(verificationService.deleteSpecialtyClaim).mockReset();
    vi.mocked(verificationService.resubmitSpecialtyClaim).mockReset();
  });

  it('only offers catalog specialties that are not claimed yet', () => {
    renderPicker([claim()]);

    const select = screen.getByLabelText(/^specialty$/i);
    expect(screen.getByRole('option', { name: 'Dermatology' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Cardiology' })).not.toBeInTheDocument();
    expect(select).toBeInTheDocument();
  });

  it('claims a specialty from the catalog', async () => {
    vi.mocked(verificationService.createSpecialtyClaim).mockResolvedValue(claim({ specialtyId: DERMATOLOGY.id, specialty: DERMATOLOGY }));
    const user = userEvent.setup();
    renderPicker([]);

    await user.selectOptions(screen.getByLabelText(/^specialty$/i), DERMATOLOGY.id);
    await user.click(screen.getByRole('button', { name: /claim specialty/i }));

    await waitFor(() => expect(verificationService.createSpecialtyClaim).toHaveBeenCalledWith(DERMATOLOGY.id, 'test-token'));
  });

  it('asks for a selection instead of claiming nothing', async () => {
    const user = userEvent.setup();
    renderPicker([]);

    await user.click(screen.getByRole('button', { name: /claim specialty/i }));

    expect(await screen.findByText(/choose a specialty to claim/i)).toBeInTheDocument();
    expect(verificationService.createSpecialtyClaim).not.toHaveBeenCalled();
  });

  it.each(STATUS_ROWS)('renders the $status claim state as "$label"', ({ status, label, rejected, withdrawable }) => {
    const { container } = renderPicker([claim({ status })]);

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)).not.toBeNull();

    const resubmit = screen.queryByRole('button', { name: /resubmit claim/i });
    if (rejected) {
      expect(resubmit).not.toBeNull();
      expect(screen.getByText(/reason:/i)).toBeInTheDocument();
    } else {
      expect(resubmit).toBeNull();
      expect(screen.queryByText(/reason:/i)).toBeNull();
    }

    if (withdrawable) {
      expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole('button', { name: /withdraw/i })).toBeNull();
    }
  });

  it('shows the reason recorded against a rejected claim', () => {
    renderPicker([claim({ status: 'rejected', rejectionReason: 'The certificate is for nursing, not cardiology.' })]);

    expect(screen.getByText(/certificate is for nursing/i)).toBeInTheDocument();
  });

  it('falls back to next steps when a rejection has no reason', () => {
    renderPicker([claim({ status: 'rejected', rejectionReason: null })]);

    expect(screen.getByText(/no reason was recorded/i)).toBeInTheDocument();
  });

  it('resubmits a rejected claim for a fresh review', async () => {
    vi.mocked(verificationService.resubmitSpecialtyClaim).mockResolvedValue(claim({ status: 'pending' }));
    const user = userEvent.setup();
    renderPicker([claim({ id: 'sc-7', status: 'rejected' })]);

    await user.click(screen.getByRole('button', { name: /resubmit claim/i }));

    await waitFor(() => expect(verificationService.resubmitSpecialtyClaim).toHaveBeenCalledWith('sc-7', 'test-token'));
  });

  it('withdraws a claim that has not been verified', async () => {
    vi.mocked(verificationService.deleteSpecialtyClaim).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPicker([claim({ id: 'sc-8' })]);

    await user.click(screen.getByRole('button', { name: /withdraw/i }));

    await waitFor(() => expect(verificationService.deleteSpecialtyClaim).toHaveBeenCalledWith('sc-8', 'test-token'));
  });

  it('says so when nothing is claimed yet', () => {
    renderPicker([]);
    expect(screen.getByText(/no specialty claims yet/i)).toBeInTheDocument();
  });

  it('disables claiming once the catalog is exhausted', () => {
    renderPicker([claim(), claim({ id: 'sc-2', specialtyId: DERMATOLOGY.id, specialty: DERMATOLOGY })]);

    expect(screen.getByRole('button', { name: /claim specialty/i })).toBeDisabled();
    expect(screen.getByText(/already on your application/i)).toBeInTheDocument();
  });

  it('shows a loading state while the catalog is fetched', () => {
    renderPicker([], { isLoading: true });
    expect(screen.getByText(/loading the specialty catalog/i)).toBeInTheDocument();
  });

  it('shows an empty catalog instead of a broken select', () => {
    render(
      <SpecialtyClaimPicker
        catalog={[]}
        claims={[]}
        isLoading={false}
        error={null}
      />,
    );
    expect(screen.getByText(/catalog is empty/i)).toBeInTheDocument();
  });

  it('shows the backend message when the catalog cannot be read', () => {
    renderPicker([], { error: 'The specialty catalog is offline.' });
    expect(screen.getByRole('alert')).toHaveTextContent('The specialty catalog is offline.');
  });

  it('surfaces the server reason when a claim is refused', async () => {
    vi.mocked(verificationService.createSpecialtyClaim).mockRejectedValue(
      new Error('Only two specialties may be claimed per application.'),
    );
    const user = userEvent.setup();
    renderPicker([]);

    await user.selectOptions(screen.getByLabelText(/^specialty$/i), DERMATOLOGY.id);
    await user.click(screen.getByRole('button', { name: /claim specialty/i }));

    expect(await screen.findByText(/only two specialties may be claimed/i)).toBeInTheDocument();
  });
});
