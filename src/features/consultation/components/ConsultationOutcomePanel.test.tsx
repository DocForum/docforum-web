import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import * as consultationService from '../../../services/consultation-service';
import type {
  ConsultationIssuedOrder,
  ConsultationRecord,
  ConsultationReferral,
} from '../../../types/models';
import { ConsultationOutcomePanel } from './ConsultationOutcomePanel';

vi.mock('../../../services/consultation-service');

const RECORD: ConsultationRecord = {
  id: 'consult-1',
  appointmentId: 'appt-1',
  notes: 'Demo notes.',
  outcome: 'referred',
  followUpAfterDays: null,
  recordedAt: '2026-01-01T10:00:00Z',
};

const REFERRAL: ConsultationReferral = {
  id: 'ref-1',
  consultationId: 'consult-1',
  targetSpecialty: 'Cardiology',
  reason: 'Demo reason.',
  status: 'pending',
  createdAt: '2026-01-01T10:01:00Z',
};

const ORDER: ConsultationIssuedOrder = {
  id: 'order-1',
  consultationId: 'consult-1',
  orderType: 'prescription',
  medicationOrTest: 'Demo medicine',
  instructions: null,
  issuedAt: '2026-01-01T10:02:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(consultationService.recordConsultation).mockResolvedValue(RECORD);
  vi.mocked(consultationService.createConsultationReferral).mockResolvedValue(REFERRAL);
  vi.mocked(consultationService.issueConsultationOrder).mockResolvedValue(ORDER);
});

describe('ConsultationOutcomePanel', () => {
  it('requires consultation notes before recording', () => {
    render(<ConsultationOutcomePanel appointmentId="appt-1" notes="   " />);

    expect(screen.getByRole('button', { name: /record consultation/i })).toBeDisabled();
    expect(screen.getByText(/add consultation notes above/i)).toBeInTheDocument();
  });

  it('records a resolved consultation without extras', async () => {
    const user = userEvent.setup();
    render(<ConsultationOutcomePanel appointmentId="appt-1" notes="Patient improved." />);

    await user.click(screen.getByRole('button', { name: /record consultation/i }));

    await waitFor(() => {
      expect(consultationService.recordConsultation).toHaveBeenCalledWith(
        'appt-1',
        { notes: 'Patient improved.', outcome: 'resolved', followUpAfterDays: null },
        'test-token',
      );
    });
    expect(consultationService.createConsultationReferral).not.toHaveBeenCalled();
    expect(consultationService.issueConsultationOrder).not.toHaveBeenCalled();
    expect(await screen.findByText(/consultation recorded as/i)).toBeInTheDocument();
  });

  it('creates a referral when the outcome is referred', async () => {
    const user = userEvent.setup();
    render(<ConsultationOutcomePanel appointmentId="appt-1" notes="Needs a cardiologist." />);

    await user.click(screen.getByRole('radio', { name: 'Referred' }));
    await user.type(screen.getByLabelText('Target specialty'), 'Cardiology');
    await user.type(screen.getByLabelText('Referral reason'), 'Demo reason.');

    await user.click(screen.getByRole('button', { name: /record consultation/i }));

    await waitFor(() => {
      expect(consultationService.createConsultationReferral).toHaveBeenCalledWith(
        'consult-1',
        { targetSpecialty: 'Cardiology', reason: 'Demo reason.' },
        'test-token',
      );
    });
    expect(await screen.findByText(/referral created for cardiology/i)).toBeInTheDocument();
  });

  it('records follow-up timing and issues an order in the same submission', async () => {
    const user = userEvent.setup();
    render(<ConsultationOutcomePanel appointmentId="appt-1" notes="Review in two weeks." />);

    await user.click(screen.getByRole('radio', { name: 'Follow-up needed' }));
    const days = screen.getByLabelText('Follow up in days');
    await user.clear(days);
    await user.type(days, '14');

    await user.click(screen.getByLabelText(/issue a prescription or lab order/i));
    await user.type(screen.getByLabelText('Medication'), 'Demo medicine');
    await user.type(screen.getByLabelText('Dose'), '1 tablet daily');

    await user.click(screen.getByRole('button', { name: /record consultation/i }));

    await waitFor(() => {
      expect(consultationService.recordConsultation).toHaveBeenCalledWith(
        'appt-1',
        { notes: 'Review in two weeks.', outcome: 'follow_up_needed', followUpAfterDays: 14 },
        'test-token',
      );
      expect(consultationService.issueConsultationOrder).toHaveBeenCalledWith(
        'consult-1',
        {
          orderType: 'prescription',
          medication: 'Demo medicine',
          dose: '1 tablet daily',
          instructions: null,
        },
        'test-token',
      );
    });
    expect(await screen.findByText(/demo medicine issued/i)).toBeInTheDocument();
  });

  it('validates required referral fields before calling the API', async () => {
    const user = userEvent.setup();
    render(<ConsultationOutcomePanel appointmentId="appt-1" notes="Needs referral." />);

    await user.click(screen.getByRole('radio', { name: 'Referred' }));
    await user.click(screen.getByRole('button', { name: /record consultation/i }));

    expect(await screen.findByText('Target specialty is required.')).toBeInTheDocument();
    expect(screen.getByText('Referral reason is required.')).toBeInTheDocument();
    expect(consultationService.recordConsultation).not.toHaveBeenCalled();
  });
});
