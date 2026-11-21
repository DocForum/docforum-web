import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { DoctorDirectory } from './DoctorDirectory';
import * as directoryService from '../../../services/doctor-directory-service';
import * as appointmentsService from '../../../services/appointments-service';
import type { AvailabilitySlot, PublicDoctor } from '../../../types/models';

vi.mock('../../../services/doctor-directory-service');
vi.mock('../../../services/appointments-service');

const SPECIALTY = { id: 'spc-derm', name: 'Dermatology', slug: 'dermatology' };

const DOCTOR: PublicDoctor = {
  id: 'doc-1',
  fullName: 'Dr. Ada Example',
  specialties: [SPECIALTY],
};

const SLOT: AvailabilitySlot = {
  id: 'slot-1',
  doctorProfileId: 'doc-1',
  status: 'open',
  startTime: '2026-11-24T09:00:00.000Z',
  endTime: '2026-11-24T09:30:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.setItem('docforum-time-zone', 'UTC');
  vi.mocked(directoryService.listSpecialties).mockResolvedValue([SPECIALTY]);
  vi.mocked(directoryService.listPublicDoctors).mockResolvedValue({ items: [DOCTOR], nextCursor: null });
  vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT]);
});

describe('DoctorDirectory', () => {
  it('lists verified doctors with their next open time', async () => {
    render(<DoctorDirectory />, { role: 'patient' });

    expect(await screen.findByRole('link', { name: 'Dr. Ada Example' })).toBeInTheDocument();
    expect(screen.getAllByText(/Dermatology/).length).toBeGreaterThan(0);
    expect(await screen.findByText(/09:00-09:30/)).toBeInTheDocument();
  });

  it('requests only the chosen specialty', async () => {
    const user = userEvent.setup();
    render(<DoctorDirectory />, { role: 'patient' });

    await screen.findByRole('option', { name: 'Dermatology' });
    await user.selectOptions(screen.getByLabelText('Specialty'), 'dermatology');

    await waitFor(() =>
      expect(directoryService.listPublicDoctors).toHaveBeenLastCalledWith(
        expect.objectContaining({ specialty: 'dermatology', limit: 20 }),
        expect.anything(),
      ),
    );
  });

  it('shows a useful empty state when no doctor matches', async () => {
    vi.mocked(directoryService.listPublicDoctors).mockResolvedValue({ items: [], nextCursor: null });

    render(<DoctorDirectory />, { role: 'patient' });

    expect(await screen.findByText(/No verified doctors in this specialty yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show all specialties/i })).toBeInTheDocument();
  });
});
