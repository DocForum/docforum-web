import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../../test/render';
import { PatientReferralList } from './PatientReferralList';
import { ApiError } from '../../../services/api-client';
import * as patientReferralsService from '../../../services/patient-referrals-service';
import type { PatientReferral } from '../../../types/models';

vi.mock('../../../services/patient-referrals-service');

const PENDING: PatientReferral = {
  id: 'ref-1',
  sourceConsultationId: 'cons-1',
  referringDoctorId: 'doc-1',
  targetSpecialtyId: 'spec-cardio',
  targetDoctorId: 'doc-2',
  parentReferralId: null,
  status: 'pending',
  resultingAppointmentId: null,
  createdAt: '2026-10-01T09:00:00.000Z',
  updatedAt: '2026-10-01T09:00:00.000Z',
  targetSpecialty: { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' },
  referringDoctor: { id: 'doc-1', fullName: 'Dr Amina Referrer' },
  targetDoctor: { id: 'doc-2', fullName: 'Dr Sam Specialist' },
  appointment: null,
  referralNote: 'Please assess the chest pain described in the consultation.',
};

function accepted(): PatientReferral {
  return {
    ...PENDING,
    status: 'accepted',
    resultingAppointmentId: 'appt-9',
    appointment: {
      id: 'appt-9',
      startsAt: '2026-11-02T10:30:00.000Z',
      endsAt: '2026-11-02T11:00:00.000Z',
      doctorName: 'Dr Sam Specialist',
      status: 'scheduled',
      requiresIntake: true,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(patientReferralsService.listMyReferrals).mockResolvedValue({ items: [PENDING] });
  vi.mocked(patientReferralsService.acceptReferral).mockResolvedValue({
    referral: accepted(),
    appointment: accepted().appointment!,
  });
  vi.mocked(patientReferralsService.declineReferral).mockResolvedValue({
    referral: { ...PENDING, status: 'declined' },
  });
});

describe('PatientReferralList', () => {
  it('shows a pending referral with both actions and makes clear nothing is booked yet', async () => {
    render(<PatientReferralList />, { role: 'patient' });

    expect(await screen.findByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText(/Referred by Dr Amina Referrer/)).toBeInTheDocument();
    expect(screen.getByText(PENDING.referralNote!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept and book appointment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^decline$/i })).toBeInTheDocument();
  });

  it('confirms what accepting produces before calling the API', async () => {
    const user = userEvent.setup();
    render(<PatientReferralList />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /accept and book appointment/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(/accepting books an appointment/i);
    expect(patientReferralsService.acceptReferral).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /accept and book appointment/i }));

    await waitFor(() =>
      expect(patientReferralsService.acceptReferral).toHaveBeenCalledWith('ref-1', 'test-patient-token'),
    );

    const panel = (await screen.findByText('Appointment booked')).closest('[role="status"]');
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText(/Dr Sam Specialist/)).toBeInTheDocument();
    expect(within(panel as HTMLElement).getByRole('link', { name: /view the appointment/i })).toHaveAttribute(
      'href',
      '/appointments/appt-9',
    );
    expect(within(panel as HTMLElement).getByRole('link', { name: /finish your intake/i })).toHaveAttribute(
      'href',
      '/patient/appointments/appt-9/intake',
    );
  });

  it('declines without booking anything', async () => {
    const user = userEvent.setup();
    render(<PatientReferralList />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /^decline$/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/no appointment is booked/i);
    await user.click(screen.getByRole('button', { name: /decline referral/i }));

    await waitFor(() =>
      expect(patientReferralsService.declineReferral).toHaveBeenCalledWith('ref-1', 'test-patient-token'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/referral declined/i);
    expect(patientReferralsService.acceptReferral).not.toHaveBeenCalled();
  });

  it('explains a conflict when someone already answered the referral', async () => {
    vi.mocked(patientReferralsService.acceptReferral).mockRejectedValue(
      new ApiError('Already answered', 409),
    );
    const user = userEvent.setup();
    render(<PatientReferralList />, { role: 'patient' });

    await user.click(await screen.findByRole('button', { name: /accept and book appointment/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /accept and book appointment/i }),
    );

    expect(await screen.findByText(/already answered this referral/i)).toBeInTheDocument();
    expect(screen.queryByText('Appointment booked')).not.toBeInTheDocument();
  });

  it('shows a way forward when there are no referrals', async () => {
    vi.mocked(patientReferralsService.listMyReferrals).mockResolvedValue({ items: [] });
    render(<PatientReferralList />, { role: 'patient' });

    expect(await screen.findByText(/no referrals waiting/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /find a doctor/i })).toHaveAttribute(
      'href',
      '/patient/search',
    );
  });
});
