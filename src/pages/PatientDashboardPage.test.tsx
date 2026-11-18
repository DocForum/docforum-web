import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '../test/render';
import { PatientDashboardPage } from './PatientDashboardPage';
import { useAuthStore } from '../store/auth-store';
import { useProfileStore } from '../store/profile-store';
import type { PatientAppointment, Dependent, HealthEntry, HealthSectionKey } from '../types/models';
import * as dependentsService from '../services/dependents-service';
import * as healthService from '../services/health-profile-service';
import * as appointmentsService from '../services/appointments-service';

vi.mock('../services/dependents-service');
vi.mock('../services/health-profile-service');
vi.mock('../services/appointments-service');

const DAY_MS = 24 * 60 * 60 * 1000;

function dependent(overrides: Partial<Dependent>): Dependent {
  return {
    id: 'dep-1',
    guardianProfileId: 'gp-1',
    fullName: 'Child One',
    dateOfBirth: '2012-05-15',
    relationship: 'parent',
    handoverStatus: 'not_eligible',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function entry(overrides: Partial<HealthEntry>): HealthEntry {
  return {
    id: 'he-1',
    patientProfileId: 'pp-1',
    section: 'allergies',
    name: 'Penicillin',
    version: 1,
    updatedAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Every section resolves to the same list unless a section map is given, so
 * tests describe only the data they care about. */
function mockHealth(bySection: Partial<Record<HealthSectionKey, HealthEntry[] | Error>> = {}) {
  vi.mocked(healthService.listHealthEntries).mockImplementation((_profileId, section) => {
    const value = bySection[section] ?? [];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
}

/** "Late this evening" is the one slot time that is guaranteed to still be
 * today *and* still ahead of the patient, whatever local timezone CI runs in —
 * a fixed `09:00` would be in the past for an afternoon run. */
function laterToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 50, 0);
}

function appointment(start: Date, status: PatientAppointment['status'] = 'scheduled'): PatientAppointment {
  return {
    id: 'apt-1',
    patientProfileId: 'pp-1',
    doctorProfileId: 'dp-1',
    availabilitySlotId: 'slot-1',
    status,
    origin: 'direct_booking',
    createdAt: '2026-10-13T09:00:00Z',
    updatedAt: '2026-10-13T09:00:00Z',
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'dp-1',
      status: 'booked',
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 10 * 60 * 1000).toISOString(),
      createdAt: '2026-10-01T09:00:00Z',
      updatedAt: '2026-10-01T09:00:00Z',
    },
  };
}

describe('PatientDashboardPage care hub', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({ profiles: [{ id: 'pp-1', fullName: 'Self', isSelf: true }], selectedProfileId: 'pp-1' });
    vi.mocked(dependentsService.listDependents).mockReset();
    vi.mocked(healthService.listHealthEntries).mockReset();
    vi.mocked(appointmentsService.listMyAppointments).mockReset();
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([]);
    mockHealth();
  });

  it('ranks an expired handover invite above a not-yet-blocked one', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([
      dependent({ id: 'dep-2', fullName: 'Child Two', handoverStatus: 'eligible' }),
      dependent({
        id: 'dep-1',
        fullName: 'Amara',
        handoverStatus: 'invited',
        claimEmail: 'amara@example.test',
        claimInviteExpiresAt: new Date(Date.now() - DAY_MS).toISOString(),
      }),
    ]);
    mockHealth({ allergies: [entry({})] });

    render(<PatientDashboardPage />);

    const actionHeading = await screen.findByRole('heading', { name: 'Action needed' });
    const actionSection = actionHeading.parentElement as HTMLElement;
    await within(actionSection).findByText(/Resend Amara's invite/i);
    const cards = within(actionSection).getAllByRole('link');
    expect(cards[0]).toHaveTextContent(/Resend Amara's invite/i);
    expect(cards[1]).toHaveTextContent(/Start Child Two's handover/i);
    expect(within(actionSection).getByText('Invite expired')).toBeInTheDocument();
  });

  it('prompts for a health profile that is genuinely empty', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    mockHealth();

    render(<PatientDashboardPage />);

    expect(await screen.findByText(/Add your allergies, conditions and medications/i)).toBeInTheDocument();
  });

  it('does not call a profile empty when a health section failed to load', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    mockHealth({ conditions: new Error('offline') });

    render(<PatientDashboardPage />);

    await screen.findByText(/could not be loaded/i);
    expect(screen.queryByText(/Add your allergies, conditions and medications/i)).not.toBeInTheDocument();
  });

  it('keeps rendering the rest of the hub when one source fails', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([
      dependent({ handoverStatus: 'eligible' }),
    ]);
    mockHealth({ medications: new Error('offline') });

    render(<PatientDashboardPage />);

    expect(await screen.findByText(/Start Child One's handover/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
  });

  it('renders the dependent cards instead of an endless spinner while no care profile is selected', async () => {
    useProfileStore.setState({ profiles: [], selectedProfileId: null });
    vi.mocked(dependentsService.listDependents).mockResolvedValue([
      dependent({ handoverStatus: 'eligible' }),
    ]);
    mockHealth();

    render(<PatientDashboardPage />);

    expect(await screen.findByText(/Start Child One's handover/i)).toBeInTheDocument();
    expect(screen.queryByText(/Loading your care summary/i)).not.toBeInTheDocument();
    // Nothing was fetched, so nothing was fetched-and-found-empty either: the
    // hub must not read a profile with no health data as an empty one.
    expect(healthService.listHealthEntries).not.toHaveBeenCalled();
    expect(screen.queryByText(/Add your allergies, conditions and medications/i)).not.toBeInTheDocument();
  });

  it('lists a recently updated entry under Recent', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    mockHealth({ allergies: [entry({ id: 'he-9', name: 'Latex' })] });

    render(<PatientDashboardPage />);

    expect(await screen.findByText('Latex updated')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
  });

  it('hides the Recent section when nothing changed recently', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    mockHealth({
      conditions: [entry({ id: 'he-old', name: 'Asthma', updatedAt: new Date(Date.now() - 90 * DAY_MS).toISOString() })],
    });

    render(<PatientDashboardPage />);

    await screen.findByText(/Nothing needs your attention right now/i);
    expect(screen.queryByRole('heading', { name: 'Recent' })).not.toBeInTheDocument();
    expect(screen.queryByText('Asthma updated')).not.toBeInTheDocument();
  });

  it('keeps the detail links reachable from the hub', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    mockHealth({
      conditions: [entry({ id: 'he-settled', name: 'Asthma', updatedAt: new Date(Date.now() - 90 * DAY_MS).toISOString() })],
    });

    render(<PatientDashboardPage />);

    await screen.findByText(/Nothing needs your attention right now/i);
    expect(screen.getByRole('link', { name: /manage dependents/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /health profile/i })).toBeInTheDocument();
  });

  it('brings a visit happening today into Action needed and points at check-in', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment(laterToday())]);

    render(<PatientDashboardPage />);

    const action = within(screen.getByRole('heading', { name: 'Action needed' }).parentElement as HTMLElement);
    const card = await action.findByRole('link', { name: /check in for your visit today/i });
    expect(card).toHaveAttribute('href', '/patient/appointments/apt-1');
    expect(within(card).getByText('Today')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Coming up' })).not.toBeInTheDocument();
  });

  it('files a later visit under Coming up without promising check-in today', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    // "Tomorrow" in the component's own terms is the calendar day of
    // now + 24h (formatSlotDate compares against that), so build the visit
    // from that day. A raw now + 26h only lands on it when the run starts
    // before 22:00 local — after that it crosses two midnights and the label
    // falls back to a plain date. Noon keeps the slot unambiguously ahead of
    // the patient, so the card lands under "Coming up".
    const tomorrow = new Date(Date.now() + DAY_MS);
    const visit = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0, 0);
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([appointment(visit)]);

    render(<PatientDashboardPage />);

    const comingUp = await screen.findByRole('heading', { name: 'Coming up' });
    const section = within(comingUp.parentElement as HTMLElement);
    const card = await section.findByRole('link', { name: /visit tomorrow at \d{2}:\d{2}/i });
    expect(section.getByText('Check-in opens on the day of your visit.')).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/patient/appointments/apt-1');
    expect(screen.getByRole('heading', { name: 'Action needed' }).parentElement).not.toHaveTextContent(/visit tomorrow/i);
  });

  it('does not offer a cancelled visit for check-in', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([
      appointment(laterToday(), 'cancelled'),
    ]);

    render(<PatientDashboardPage />);

    // Anchor on *something* the hub settled into: the empty-profile prompt,
    // which only appears once every other source has answered.
    await screen.findByText(/Add your allergies/i);
    expect(screen.queryByText(/check in for your visit today/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Coming up' })).not.toBeInTheDocument();
  });

  it('says the visit list could not be loaded instead of showing no visits', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([dependent({ handoverStatus: 'eligible' })]);
    vi.mocked(appointmentsService.listMyAppointments).mockRejectedValue(new Error('offline'));

    render(<PatientDashboardPage />);

    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    // The rest of the hub is still real, so it must still be on screen.
    expect(screen.getByText(/Start Child One's handover/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing needs your attention right now/i)).not.toBeInTheDocument();
  });

  it('makes no visit request without a session, and does not spin forever', async () => {
    useAuthStore.setState({ accessToken: null });

    render(<PatientDashboardPage />);

    expect(await screen.findByText(/Nothing needs your attention right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/Loading your care summary/i)).not.toBeInTheDocument();
    expect(appointmentsService.listMyAppointments).not.toHaveBeenCalled();
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument();
  });
});
