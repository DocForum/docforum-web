import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { ConsultationOutcomePanel } from './ConsultationOutcomePanel';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as consultationService from '../../../services/consultation-service';
import * as prescriptionsService from '../../../services/prescriptions-service';
import * as doctorProfileService from '../../../services/doctor-profile-service';
import * as facilityService from '../../../services/facility-service';
import * as appointmentService from '../../../services/appointment-service';
import type {
  Consultation,
  EligibleFacility,
  IssuedLabOrder,
  IssuedPrescription,
  MyDoctorProfile,
} from '../../../types/models';

vi.mock('../../../services/consultation-service');
vi.mock('../../../services/prescriptions-service');
vi.mock('../../../services/doctor-profile-service');
vi.mock('../../../services/facility-service');
vi.mock('../../../services/appointment-service');

const CONSULTATION: Consultation = {
  id: 'con-1',
  appointmentId: 'apt-1',
  outcome: 'follow_up_needed',
  notes: null,
  createdAt: '2026-11-20T09:00:00.000Z',
  updatedAt: '2026-11-20T09:00:00.000Z',
};

const PAYMENT_INTENT = {
  id: 'pi-1',
  orderType: 'prescription' as const,
  orderId: 'rx-1',
  status: 'created' as const,
  patientProfileId: 'prf-patient',
  facilityId: 'fac-pharmacy',
  amountStroops: '25000000',
  escrowId: null,
  stellarTxHash: null,
  sorobanContractId: null,
  createdAt: '2026-11-20T09:05:00.000Z',
  updatedAt: '2026-11-20T09:05:00.000Z',
};

const PRESCRIPTION: IssuedPrescription = {
  id: 'rx-1',
  consultationId: 'con-1',
  patientProfileId: 'prf-patient',
  prescribingDoctorId: 'doc-1',
  facilityProfileId: 'fac-pharmacy',
  amountStroops: '25000000',
  status: 'issued',
  supersedesPrescriptionId: null,
  createdAt: '2026-11-20T09:05:00.000Z',
  items: [
    {
      id: 'rxi-1',
      prescriptionId: 'rx-1',
      drugName: 'Amoxicillin (fake)',
      dosage: '500 mg',
      frequency: 'every 8 hours',
      duration: '5 days',
    },
  ],
  paymentIntent: PAYMENT_INTENT,
};

const LAB_ORDER: IssuedLabOrder = {
  id: 'lab-1',
  consultationId: 'con-1',
  patientProfileId: 'prf-patient',
  orderingDoctorId: 'doc-1',
  facilityProfileId: 'fac-lab',
  amountStroops: '10000000',
  testType: 'Full blood count',
  urgency: 'routine',
  notes: null,
  status: 'issued',
  supersedesLabOrderId: null,
  createdAt: '2026-11-20T09:06:00.000Z',
  expiresAt: null,
  paymentIntent: { ...PAYMENT_INTENT, id: 'pi-2', orderType: 'lab_order', orderId: 'lab-1' },
};

const DOCTOR: MyDoctorProfile = {
  id: 'doc-1',
  userId: 'usr-doctor',
  fullName: 'Dr. Demo Doctor (fake)',
  verificationStatus: 'verified',
  timeZone: 'Europe/London',
  version: 1,
  createdAt: '2026-01-06T09:00:00.000Z',
  updatedAt: '2026-01-06T09:00:00.000Z',
};

const FACILITIES: EligibleFacility[] = [
  {
    id: 'fac-pharmacy',
    userId: 'usr-pharmacy',
    name: 'Demo Pharmacy (fake)',
    type: 'pharmacy',
    distanceKm: null,
    priceOnRequest: true,
    price: null,
  },
  {
    id: 'fac-lab',
    userId: 'usr-lab',
    name: 'Demo Lab (fake)',
    type: 'lab',
    distanceKm: null,
    priceOnRequest: true,
    price: null,
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ accessToken: 'test-token', user: null });

  vi.mocked(doctorProfileService.getMyDoctorProfile).mockResolvedValue(DOCTOR);
  vi.mocked(facilityService.listEligibleFacilities).mockImplementation(async (type) =>
    FACILITIES.filter((facility) => facility.type === type),
  );
  vi.mocked(appointmentService.getAppointmentById).mockResolvedValue({
    id: 'apt-1',
    doctorProfileId: 'doc-1',
    patientProfileId: 'prf-patient',
    patientName: 'Pat Placeholder (fake)',
    startsAt: '2026-11-20T08:00:00.000Z',
    endsAt: '2026-11-20T08:30:00.000Z',
    status: 'completed',
  });
  vi.mocked(consultationService.createConsultation).mockResolvedValue(CONSULTATION);
  vi.mocked(prescriptionsService.issuePrescription).mockResolvedValue(PRESCRIPTION);
  vi.mocked(prescriptionsService.issueLabOrder).mockResolvedValue(LAB_ORDER);
});

async function closeConsultation() {
  const user = userEvent.setup();
  render(<ConsultationOutcomePanel appointmentId="apt-1" />);

  await user.selectOptions(screen.getByLabelText(/consultation outcome/i), 'follow_up_needed');
  await user.type(screen.getByLabelText(/outcome notes/i), 'Review in two weeks (fake).');
  await user.click(screen.getByRole('button', { name: /close consultation/i }));

  await screen.findByText(/consultation closed/i);
  return user;
}

describe('ConsultationOutcomePanel', () => {
  it('closes the visit once with the outcome and notes, then offers order tabs', async () => {
    await closeConsultation();

    expect(consultationService.createConsultation).toHaveBeenCalledWith(
      {
        appointmentId: 'apt-1',
        outcome: 'follow_up_needed',
        notes: 'Review in two weeks (fake).',
      },
      'test-token',
    );
    expect(screen.getByRole('tab', { name: /prescription/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /lab order/i })).toBeInTheDocument();
  });

  it('explains that a visit already closed cannot be closed twice', async () => {
    vi.mocked(consultationService.createConsultation).mockRejectedValue(
      new ApiError('Mock API: this appointment already has a consultation', 409),
    );
    const user = userEvent.setup();
    render(<ConsultationOutcomePanel appointmentId="apt-1" />);

    await user.click(screen.getByRole('button', { name: /close consultation/i }));

    expect(await screen.findByText(/already has a consultation/i)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /prescription/i })).not.toBeInTheDocument();
  });

  it('issues a multi-item prescription with exactly one price field', async () => {
    const user = await closeConsultation();

    await user.selectOptions(screen.getByLabelText(/dispensing pharmacy/i), 'fac-pharmacy');

    const medicationNames = screen.getAllByLabelText('Medication');
    await user.type(medicationNames[0], 'Amoxicillin (fake)');
    await user.type(screen.getAllByLabelText('Dose')[0], '500 mg');
    await user.type(screen.getAllByLabelText('Frequency')[0], 'every 8 hours');
    await user.type(screen.getAllByLabelText('Duration')[0], '5 days');

    await user.click(screen.getByRole('button', { name: /add another medication/i }));
    await user.type(screen.getAllByLabelText('Medication')[1], 'Ibuprofen (fake)');
    await user.type(screen.getAllByLabelText('Dose')[1], '200 mg');
    await user.type(screen.getAllByLabelText('Frequency')[1], 'twice daily');
    await user.type(screen.getAllByLabelText('Duration')[1], '3 days');

    await user.type(screen.getByLabelText(/price \(xlm\)/i), '2.5');
    await user.click(screen.getByRole('button', { name: /issue prescription/i }));

    await waitFor(() => {
      expect(prescriptionsService.issuePrescription).toHaveBeenCalledWith(
        'con-1',
        expect.objectContaining({
          facilityProfileId: 'fac-pharmacy',
          amountStroops: '25000000',
          items: [
            {
              drugName: 'Amoxicillin (fake)',
              dosage: '500 mg',
              frequency: 'every 8 hours',
              duration: '5 days',
            },
            {
              drugName: 'Ibuprofen (fake)',
              dosage: '200 mg',
              frequency: 'twice daily',
              duration: '3 days',
            },
          ],
        }),
        'test-token',
      );
    });
    expect(await screen.findByText(/issued this session/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Amoxicillin \(fake\)/i).length).toBeGreaterThan(0);
  });

  it('submits one lab order per test for a multi-test order', async () => {
    const user = await closeConsultation();

    await user.click(screen.getByRole('tab', { name: /lab order/i }));
    await user.selectOptions(screen.getByLabelText(/fulfilling lab/i), 'fac-lab');
    await user.type(screen.getByLabelText(/test 1/i), 'Full blood count');
    await user.click(screen.getByRole('button', { name: /add another test/i }));
    await user.type(screen.getByLabelText(/test 2/i), 'Lipid panel');
    await user.type(screen.getByLabelText(/price \(xlm\)/i), '1');
    await user.click(screen.getByRole('button', { name: /issue lab orders/i }));

    await waitFor(() => {
      expect(prescriptionsService.issueLabOrder).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(prescriptionsService.issueLabOrder).mock.calls[0][1]).toMatchObject({
      facilityProfileId: 'fac-lab',
      testType: 'Full blood count',
      urgency: 'routine',
      amountStroops: '10000000',
    });
    expect(vi.mocked(prescriptionsService.issueLabOrder).mock.calls[1][1]).toMatchObject({
      testType: 'Lipid panel',
    });
  });

  it('links an unverified-doctor 403 to the verification page', async () => {
    vi.mocked(prescriptionsService.issuePrescription).mockRejectedValue(
      new ApiError('A verified doctor profile is required to issue orders.', 403),
    );
    const user = await closeConsultation();

    await user.selectOptions(screen.getByLabelText(/dispensing pharmacy/i), 'fac-pharmacy');
    await user.type(screen.getByLabelText('Medication'), 'Amoxicillin (fake)');
    await user.type(screen.getByLabelText('Dose'), '500 mg');
    await user.type(screen.getByLabelText('Frequency'), 'every 8 hours');
    await user.type(screen.getByLabelText('Duration'), '5 days');
    await user.type(screen.getByLabelText(/price \(xlm\)/i), '1');
    await user.click(screen.getByRole('button', { name: /issue prescription/i }));

    expect(await screen.findByText(/orders need a verified doctor profile/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /check verification status/i });
    expect(link).toHaveAttribute('href', '/doctor/verification');
  });

  it('warns while the profile is still pending verification', async () => {
    vi.mocked(doctorProfileService.getMyDoctorProfile).mockResolvedValue({
      ...DOCTOR,
      verificationStatus: 'pending',
    });
    render(<ConsultationOutcomePanel appointmentId="apt-1" />);

    expect(await screen.findByText(/still pending verification/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /check verification status/i })).toBeInTheDocument();
  });
});
