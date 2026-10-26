import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import { MedicationSchedule } from './MedicationSchedule';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import { ApiError } from '../../../services/api-client';
import * as prescriptionsService from '../../../services/prescriptions-service';
import type { MedicationPrescription } from '../../../types/models';

vi.mock('../../../services/prescriptions-service');

function isoAt(base: Date, offsetDays: number, hour: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function prescription(overrides: Partial<MedicationPrescription> = {}, now = new Date()): MedicationPrescription {
  return {
    id: 'rx-1',
    status: 'issued',
    createdAt: isoAt(now, 0, 6),
    patientProfileId: 'pp-1',
    prescribingDoctorId: 'dr-1',
    prescribingDoctorName: 'Dr Okafor',
    items: [
      { id: 'i1', drugName: 'Amoxicillin', dosage: '500 mg', frequency: 'every 8 hours', duration: '5 days' },
    ],
    ...overrides,
  };
}

describe('MedicationSchedule', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({
      profiles: [{ id: 'pp-1', fullName: 'Self', isSelf: true }],
      selectedProfileId: 'pp-1',
    });
    vi.mocked(prescriptionsService.listActivePrescriptions).mockReset();
  });

  it('shows a loading state while fetching', () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockReturnValue(new Promise(() => {}));
    render(<MedicationSchedule />);
    expect(screen.getByText(/loading your medication schedule/i)).toBeInTheDocument();
  });

  it('scopes the request to the selected profile', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([]);
    render(<MedicationSchedule />);
    await waitFor(() => {
      expect(prescriptionsService.listActivePrescriptions).toHaveBeenCalledWith('pp-1', 'test-token');
    });
  });

  it('renders scheduled doses for today', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([prescription()]);
    render(<MedicationSchedule />);
    const today = await screen.findByRole('heading', { name: 'Today' });
    expect(today).toBeInTheDocument();
    expect(screen.getAllByText('Amoxicillin').length).toBeGreaterThan(0);
    expect(screen.getAllByText('500 mg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('06:00').length).toBeGreaterThan(0);
  });

  it('shows "as needed" items verbatim under a not-scheduled heading', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([
      prescription({
        items: [{ id: 'i1', drugName: 'Paracetamol', dosage: '1 g', frequency: 'As needed for pain', duration: 'ongoing' }],
      }),
    ]);
    render(<MedicationSchedule />);
    expect(await screen.findByRole('heading', { name: /not scheduled/i })).toBeInTheDocument();
    expect(screen.getByText('As needed for pain')).toBeInTheDocument();
    // Never turned into a fabricated clock time in the Today list.
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no active prescriptions', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([]);
    render(<MedicationSchedule />);
    expect(await screen.findByText('No active prescriptions.')).toBeInTheDocument();
  });

  it('surfaces the API error message', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockRejectedValue(new ApiError('Prescriptions unavailable.', 500));
    render(<MedicationSchedule />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Prescriptions unavailable.');
  });

  it('lists finished courses under a completed heading', async () => {
    const now = new Date();
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([
      prescription({}, now),
      { ...prescription({ id: 'rx-old', createdAt: isoAt(now, -30, 6) }) },
    ]);
    render(<MedicationSchedule />);
    expect(await screen.findByRole('heading', { name: /completed courses/i })).toBeInTheDocument();
  });

  it('warns about overlapping courses of the same medication', async () => {
    const now = new Date();
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([
      prescription({ id: 'a', items: [{ id: 'i1', drugName: 'Ibuprofen', dosage: '400 mg', frequency: 'every 8 hours', duration: '5 days' }] }, now),
      prescription({ id: 'b', createdAt: isoAt(now, 0, 8), items: [{ id: 'i2', drugName: 'ibuprofen', dosage: '200 mg', frequency: 'every 12 hours', duration: '5 days' }] }, now),
    ]);
    render(<MedicationSchedule />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/contact your prescriber/i);
    expect(alert).toHaveTextContent('Ibuprofen');
  });

  it('disables the calendar download when nothing is scheduled', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([
      prescription({ items: [{ id: 'i1', drugName: 'Paracetamol', dosage: '1 g', frequency: 'as needed', duration: 'ongoing' }] }),
    ]);
    render(<MedicationSchedule />);
    await screen.findByRole('heading', { name: /not scheduled/i });
    expect(screen.getByRole('button', { name: /add to calendar/i })).toBeDisabled();
  });

  it('enables the calendar download when doses exist', async () => {
    vi.mocked(prescriptionsService.listActivePrescriptions).mockResolvedValue([prescription()]);
    render(<MedicationSchedule />);
    await screen.findAllByText('Amoxicillin');
    expect(screen.getByRole('button', { name: /add to calendar/i })).toBeEnabled();
  });
});
