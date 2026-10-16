import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/render';
import { CareTimeline } from './CareTimeline';
import type { CareThread } from '../../../types/models';

describe('CareTimeline', () => {
  it('renders empty state when no thread or steps are provided', () => {
    render(<CareTimeline thread={null} />);

    expect(screen.getByRole('heading', { name: /no care thread found/i })).toBeInTheDocument();
    expect(screen.getByText(/there are no recorded care milestones/i)).toBeInTheDocument();
  });

  it('renders a full care thread with sequential steps and action links', () => {
    const fullThread: CareThread = {
      id: 'thread-1',
      patientProfileId: 'p1',
      title: 'Post-operative Cardiac Followup',
      doctorName: 'Dr. Sarah Connor',
      specialty: 'Cardiology',
      startedAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-10T14:30:00Z',
      status: 'active',
      steps: [
        {
          id: 'step-1',
          stepType: 'appointment',
          title: 'Initial Consultation Booked',
          description: 'Consultation scheduled for cardiology evaluation.',
          status: 'completed',
          timestamp: '2026-10-01T10:00:00Z',
        },
        {
          id: 'step-2',
          stepType: 'consultation',
          title: 'Clinical Consultation Completed',
          description: 'BP normalized. Prescribed beta blockers and referred for stress echo test.',
          status: 'completed',
          timestamp: '2026-10-02T11:00:00Z',
        },
        {
          id: 'step-3',
          stepType: 'referral',
          title: 'Specialist Referral Issued',
          description: 'Referral issued to St. Jude Cardiac Imaging Lab.',
          status: 'action_required',
          actionLabel: 'Accept referral',
          actionUrl: '/patient/referrals/ref-123',
        },
        {
          id: 'step-4',
          stepType: 'order',
          title: 'Prescription Order Placed',
          description: 'Metoprolol 25mg daily. Choose your dispensing pharmacy.',
          status: 'action_required',
          actionLabel: 'Choose a pharmacy',
          actionUrl: '/patient/facilities?type=pharmacy',
        },
        {
          id: 'step-5',
          stepType: 'fulfillment',
          title: 'Lab Results Ready',
          description: 'Imaging complete. Attached diagnostic summary.',
          status: 'completed',
          actionLabel: 'View lab results',
          actionUrl: '/patient/results/res-456',
        },
        {
          id: 'step-6',
          stepType: 'payment',
          title: 'Escrow Payment Settled',
          description: 'Payment released to St. Jude Imaging upon verified fulfillment.',
          status: 'completed',
        },
      ],
    };

    render(<CareTimeline thread={fullThread} />);

    expect(screen.getByRole('heading', { name: /post-operative cardiac followup/i })).toBeInTheDocument();
    expect(screen.getByText(/dr\. sarah connor \(cardiology\)/i)).toBeInTheDocument();
    expect(screen.getByText(/initial consultation booked/i)).toBeInTheDocument();
    expect(screen.getByText(/clinical consultation completed/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /accept referral/i })).toHaveAttribute(
      'href',
      '/patient/referrals/ref-123',
    );
    expect(screen.getByRole('link', { name: /choose a pharmacy/i })).toHaveAttribute(
      'href',
      '/patient/facilities?type=pharmacy',
    );
    expect(screen.getByRole('link', { name: /view lab results/i })).toHaveAttribute('href', '/patient/results/res-456');
    expect(screen.getByText(/escrow payment settled/i)).toBeInTheDocument();
  });

  it('renders partial thread that stopped at consultation with informative notice', () => {
    const partialThread: CareThread = {
      id: 'thread-2',
      patientProfileId: 'p1',
      title: 'Routine Health Check',
      doctorName: 'Dr. Gregory House',
      specialty: 'Internal Medicine',
      startedAt: '2026-10-05T09:00:00Z',
      updatedAt: '2026-10-05T09:45:00Z',
      status: 'completed',
      steps: [
        {
          id: 'step-1',
          stepType: 'appointment',
          title: 'Appointment Confirmed',
          description: 'Routine wellness examination.',
          status: 'completed',
          timestamp: '2026-10-05T09:00:00Z',
        },
        {
          id: 'step-2',
          stepType: 'consultation',
          title: 'Consultation Complete',
          description: 'All vital signs normal. No treatment or tests required.',
          status: 'completed',
          timestamp: '2026-10-05T09:30:00Z',
        },
      ],
    };

    render(<CareTimeline thread={partialThread} />);

    expect(screen.getByText(/routine health check/i)).toBeInTheDocument();
    expect(screen.getByText(/care episode concluded:/i)).toBeInTheDocument();
    expect(screen.getByText(/no specialist referrals or diagnostic laboratory orders/i)).toBeInTheDocument();
  });

  it('degrades gracefully when step has minimal data', () => {
    const minimalThread: CareThread = {
      id: 'thread-3',
      patientProfileId: 'p1',
      title: 'Minimal Thread',
      doctorName: 'Dr. Minimal',
      specialty: 'General Practice',
      startedAt: '2026-10-10T00:00:00Z',
      updatedAt: '2026-10-10T00:00:00Z',
      status: 'active',
      steps: [
        {
          id: 's-1',
          stepType: 'appointment',
          title: 'Minimal Step',
          description: 'No timestamp or actions.',
          status: 'pending',
        },
      ],
    };

    render(<CareTimeline thread={minimalThread} />);

    expect(screen.getByText('Minimal Step')).toBeInTheDocument();
    expect(screen.getByText('No timestamp or actions.')).toBeInTheDocument();
  });
});
