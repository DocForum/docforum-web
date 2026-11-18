import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../../App';
import { StuckReferralsConsole } from './StuckReferralsConsole';
import { ApiError } from '../../../services/api-client';
import * as referralsService from '../../../services/admin-referrals-service';
import { useAuthStore } from '../../../store/auth-store';
import type { DoctorAvailability, Role, Specialty, StuckReferral } from '../../../types/models';

vi.mock('../../../services/admin-referrals-service');
vi.mock('../../../services/my-flags-service', () => ({
  getMyFlags: vi.fn().mockResolvedValue({ flags: {} }),
}));

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

const CARDIOLOGY: Specialty = { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' };
const NEUROLOGY: Specialty = { id: 'spec-neuro', name: 'Neurology', slug: 'neurology' };
const DERMATOLOGY: Specialty = { id: 'spec-derm', name: 'Dermatology', slug: 'dermatology' };

const GP = { id: 'doc-gp', fullName: 'Dr. Grace Park' };
const ON_LEAVE = { id: 'doc-leave', fullName: 'Dr. Leo Vance' };
const NEURO = { id: 'doc-neuro', fullName: 'Dr. Nia Shah' };

const INACTIVE: StuckReferral = {
  id: 'ref-inactive',
  sourceConsultationId: 'consult-1',
  referringDoctorId: GP.id,
  targetSpecialtyId: CARDIOLOGY.id,
  targetDoctorId: ON_LEAVE.id,
  parentReferralId: null,
  status: 'pending',
  resultingAppointmentId: null,
  createdAt: hoursAgo(76),
  updatedAt: '2026-10-15T08:00:00.000Z',
  stuckReason: 'doctor_inactive',
  targetSpecialty: CARDIOLOGY,
  referringDoctor: GP,
  targetDoctor: ON_LEAVE,
  chain: null,
};

const LOOPED: StuckReferral = {
  ...INACTIVE,
  id: 'ref-loop',
  referringDoctorId: NEURO.id,
  targetDoctorId: null,
  parentReferralId: 'ref-0',
  createdAt: hoursAgo(200),
  updatedAt: '2026-10-10T08:00:00.000Z',
  stuckReason: 'loop_flagged',
  referringDoctor: NEURO,
  targetDoctor: null,
  chain: [
    {
      referralId: 'ref-0',
      referringDoctor: GP,
      targetSpecialty: NEUROLOGY,
      targetDoctor: NEURO,
      status: 'completed',
      createdAt: '2026-09-20T09:00:00.000Z',
    },
    {
      referralId: 'ref-loop',
      referringDoctor: NEURO,
      targetSpecialty: CARDIOLOGY,
      targetDoctor: null,
      status: 'pending',
      createdAt: '2026-10-10T08:00:00.000Z',
    },
  ],
};

const NO_DOCTOR: StuckReferral = {
  ...INACTIVE,
  id: 'ref-nodoc',
  targetSpecialtyId: DERMATOLOGY.id,
  targetDoctorId: null,
  createdAt: hoursAgo(50),
  stuckReason: 'no_doctor',
  targetSpecialty: DERMATOLOGY,
  targetDoctor: null,
};

const AVAILABLE: DoctorAvailability = {
  id: 'doc-amara',
  fullName: 'Dr. Amara Obi',
  verificationStatus: 'verified',
  specialties: [CARDIOLOGY],
  openSlotCount: 4,
  nextAvailableAt: '2026-10-20T09:00:00.000Z',
};

const FULL_DIARY: DoctorAvailability = {
  ...AVAILABLE,
  id: 'doc-ben',
  fullName: 'Dr. Ben Cole',
  openSlotCount: 0,
  nextAvailableAt: null,
};

// Rows the backend should never send, but the picker must survive if it does.
const UNVERIFIED: DoctorAvailability = { ...AVAILABLE, id: 'doc-pending', fullName: 'Dr. Pending Pat', verificationStatus: 'pending' };
const WRONG_SPECIALTY: DoctorAvailability = { ...AVAILABLE, id: 'doc-derm', fullName: 'Dr. Dana Reyes', specialties: [DERMATOLOGY] };
const CURRENT_DOCTOR: DoctorAvailability = { ...AVAILABLE, id: ON_LEAVE.id, fullName: ON_LEAVE.fullName };

const VALID_REASON = 'Dr. Vance is on leave until December';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderConsole(path = '/admin/referrals') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <StuckReferralsConsole />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const currentLocation = () => screen.getByTestId('location').textContent;
// Not getByRole('status'): the location probe's <output> has that role too.
const noticeText = () => document.querySelector('section [role="status"]')?.textContent;
const cardFor = (specialty: string, index = 0) =>
  screen.getAllByRole('article').filter((card) => within(card).queryByRole('heading', { name: specialty }))[index];

async function openReassign(user: ReturnType<typeof userEvent.setup>) {
  renderConsole();
  await screen.findAllByRole('article');
  // The doctor-inactive referral: the loop-flagged Cardiology one is older, so it's first.
  await user.click(within(cardFor('Cardiology', 1)).getByRole('button', { name: 'Reassign' }));
  return screen.findByRole('dialog', { name: 'Reassign referral' });
}

beforeEach(() => {
  signIn('admin');
  vi.mocked(referralsService.listStuckReferrals).mockReset();
  vi.mocked(referralsService.listReassignCandidates).mockReset();
  vi.mocked(referralsService.reassignReferral).mockReset();
  vi.mocked(referralsService.cancelReferral).mockReset();
  // Deliberately out of order — the console sorts oldest first itself.
  vi.mocked(referralsService.listStuckReferrals).mockResolvedValue({ items: [INACTIVE, NO_DOCTOR, LOOPED], nextCursor: null });
  vi.mocked(referralsService.listReassignCandidates).mockResolvedValue([FULL_DIARY, AVAILABLE]);
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('StuckReferralsConsole — queue', () => {
  it('lists stuck referrals oldest first, with age, target specialty and reason', async () => {
    renderConsole();

    const cards = await screen.findAllByRole('article');
    expect(cards.map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Cardiology',
      'Cardiology',
      'Dermatology',
    ]);
    expect(within(cards[0]).getByText('Loop flagged')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Pending 8 days')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Doctor inactive')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Pending 3 d 4 h')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Dr. Leo Vance')).toBeInTheDocument();
    expect(within(cards[2]).getByText('No doctor assigned')).toBeInTheDocument();

    expect(referralsService.listStuckReferrals).toHaveBeenCalledWith(
      { olderThan: '48h', cursor: null },
      'admin-token',
      expect.anything(),
    );
  });

  it('shows the referral chain for loop-flagged referrals only', async () => {
    renderConsole();
    await screen.findAllByRole('article');

    const loopCard = cardFor('Cardiology', 0);
    const chain = within(loopCard).getByRole('list');
    const hops = within(chain).getAllByRole('listitem');
    expect(hops).toHaveLength(2);
    expect(hops[0]).toHaveTextContent('Dr. Grace Park → Neurology (Dr. Nia Shah)');
    expect(hops[1]).toHaveTextContent('this referral');
    expect(hops[1]).toHaveAttribute('aria-current', 'step');

    expect(within(cardFor('Cardiology', 1)).queryByText(/Referral chain/)).not.toBeInTheDocument();
  });

  it('changes the age threshold through the URL and refetches', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    await user.selectOptions(screen.getByLabelText('Pending for at least'), '7 days');

    await waitFor(() => expect(currentLocation()).toBe('/admin/referrals?olderThan=168h'));
    await waitFor(() =>
      expect(vi.mocked(referralsService.listStuckReferrals).mock.lastCall?.[0]).toEqual({ olderThan: '168h', cursor: null }),
    );
  });

  it('filters loaded referrals by reason without another request', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');
    const calls = vi.mocked(referralsService.listStuckReferrals).mock.calls.length;

    await user.click(screen.getByRole('button', { name: /Loop flagged/ }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('1 of 3 loaded referrals flagged “Loop flagged”')).toBeInTheDocument();
    expect(currentLocation()).toBe('/admin/referrals?reason=loop_flagged');
    expect(referralsService.listStuckReferrals).toHaveBeenCalledTimes(calls);
  });

  it('loads the next page on request', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.listStuckReferrals).mockImplementation(async (query) =>
      query.cursor === 'page-2' ? { items: [NO_DOCTOR], nextCursor: null } : { items: [INACTIVE], nextCursor: 'page-2' },
    );
    renderConsole();
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says so when nobody is stuck', async () => {
    vi.mocked(referralsService.listStuckReferrals).mockResolvedValue({ items: [], nextCursor: null });
    renderConsole();

    expect(await screen.findByText(/No referrals have been pending for more than 2 days/)).toBeInTheDocument();
  });

  it("explains when docforum-core doesn't serve the queue yet", async () => {
    vi.mocked(referralsService.listStuckReferrals).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    expect(await screen.findByRole('alert')).toHaveTextContent(/doesn't serve the stuck-referral queue yet/);
  });
});

describe('StuckReferralsConsole — reassign', () => {
  it('offers only verified doctors in the target specialty, never the current or referring doctor', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.listReassignCandidates).mockResolvedValue([
      FULL_DIARY,
      UNVERIFIED,
      WRONG_SPECIALTY,
      CURRENT_DOCTOR,
      { ...AVAILABLE, id: GP.id, fullName: GP.fullName },
      AVAILABLE,
    ]);
    const dialog = await openReassign(user);

    const options = await within(dialog).findAllByRole('radio');
    expect(options.map((option) => option.closest('label')!.querySelector('span span')!.textContent)).toEqual([
      'Dr. Amara Obi',
      'Dr. Ben Cole',
    ]);
    expect(within(dialog).queryByText('Dr. Pending Pat')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Dr. Dana Reyes')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/2 doctors returned by docforum-core were hidden/)).toBeInTheDocument();
    expect(referralsService.listReassignCandidates).toHaveBeenCalledWith(CARDIOLOGY.id, 'admin-token', expect.anything());
  });

  it('shows each doctor’s availability', async () => {
    const user = userEvent.setup();
    const dialog = await openReassign(user);

    expect(await within(dialog).findByText(/^4 open slots in the next 7 days · next/)).toBeInTheDocument();
    expect(within(dialog).getByText('No open slots in the next 7 days')).toBeInTheDocument();
  });

  it('requires a doctor and a reason before sending anything', async () => {
    const user = userEvent.setup();
    const dialog = await openReassign(user);
    await within(dialog).findAllByRole('radio');

    await user.click(within(dialog).getByRole('button', { name: 'Reassign referral' }));
    expect(within(dialog).getByText('Choose a doctor to reassign to.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Give a reason/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: /Dr. Amara Obi/ }));
    await user.type(within(dialog).getByLabelText('Reason for reassigning'), 'on leave');
    await user.click(within(dialog).getByRole('button', { name: 'Reassign referral' }));
    expect(within(dialog).getByText('Write at least 10 characters.')).toBeInTheDocument();

    expect(referralsService.reassignReferral).not.toHaveBeenCalled();
  });

  it('reassigns with the reason and the version the admin saw, then refreshes the queue', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.reassignReferral).mockResolvedValue({ ...INACTIVE, targetDoctorId: AVAILABLE.id });
    const dialog = await openReassign(user);
    const listCalls = vi.mocked(referralsService.listStuckReferrals).mock.calls.length;

    await user.click(await within(dialog).findByRole('radio', { name: /Dr. Amara Obi/ }));
    await user.type(within(dialog).getByLabelText('Reason for reassigning'), `  ${VALID_REASON}  `);
    await user.click(within(dialog).getByRole('button', { name: 'Reassign referral' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(referralsService.reassignReferral).toHaveBeenCalledWith(
      'ref-inactive',
      { targetDoctorId: 'doc-amara', reason: VALID_REASON, expectedUpdatedAt: INACTIVE.updatedAt },
      'admin-token',
    );
    const notice = screen.getByText(/reassigned to Dr. Amara Obi/).closest<HTMLElement>('[role="status"]')!;
    expect(within(notice).getByRole('link', { name: 'View in audit trail' })).toHaveAttribute(
      'href',
      '/admin/audit?entityType=Referral&entityId=ref-inactive',
    );
    await waitFor(() => expect(referralsService.listStuckReferrals).toHaveBeenCalledTimes(listCalls + 1));
  });

  it('closes and refreshes when someone else acted first', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.reassignReferral).mockRejectedValue(new ApiError('Referral was modified', 409));
    const dialog = await openReassign(user);
    const listCalls = vi.mocked(referralsService.listStuckReferrals).mock.calls.length;

    await user.click(await within(dialog).findByRole('radio', { name: /Dr. Amara Obi/ }));
    await user.type(within(dialog).getByLabelText('Reason for reassigning'), VALID_REASON);
    await user.click(within(dialog).getByRole('button', { name: 'Reassign referral' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(noticeText()).toMatch(/This referral changed while you were working on it/);
    await waitFor(() => expect(referralsService.listStuckReferrals).toHaveBeenCalledTimes(listCalls + 1));
  });

  it('keeps the dialog open and reloads doctors when docforum-core refuses the doctor', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.reassignReferral).mockRejectedValue(
      new ApiError('Doctor is no longer verified in Cardiology', 422),
    );
    const dialog = await openReassign(user);
    await user.click(await within(dialog).findByRole('radio', { name: /Dr. Amara Obi/ }));
    await user.type(within(dialog).getByLabelText('Reason for reassigning'), VALID_REASON);
    const candidateCalls = vi.mocked(referralsService.listReassignCandidates).mock.calls.length;

    await user.click(within(dialog).getByRole('button', { name: 'Reassign referral' }));

    expect(await within(dialog).findByText(/refused the reassignment: Doctor is no longer verified/)).toBeInTheDocument();
    await waitFor(() =>
      expect(referralsService.listReassignCandidates).toHaveBeenCalledTimes(candidateCalls + 1),
    );
  });

  it('suggests cancelling when no other doctor is eligible', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.listReassignCandidates).mockResolvedValue([CURRENT_DOCTOR, UNVERIFIED]);
    const dialog = await openReassign(user);

    expect(await within(dialog).findByText(/No other verified Cardiology doctor can take this referral/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reassign referral' })).toBeDisabled();
  });

  it('marks doctors already in a flagged loop', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.listReassignCandidates).mockResolvedValue([
      AVAILABLE,
      { ...AVAILABLE, id: GP.id, fullName: GP.fullName },
    ]);
    renderConsole();
    await screen.findAllByRole('article');
    await user.click(within(cardFor('Cardiology', 0)).getByRole('button', { name: 'Reassign' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reassign referral' });

    const gpOption = await within(dialog).findByRole('radio', { name: /Dr. Grace Park/ });
    expect(gpOption.closest('label')).toHaveTextContent("Already in this referral's chain");
    expect(within(dialog).getByRole('radio', { name: /Dr. Amara Obi/ }).closest('label')).not.toHaveTextContent(
      'Already in',
    );
  });

  it('closes on Escape and returns focus to the button that opened it', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');
    const opener = within(cardFor('Cardiology', 1)).getByRole('button', { name: 'Reassign' });
    await user.click(opener);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});

describe('StuckReferralsConsole — cancel', () => {
  async function openCancel(user: ReturnType<typeof userEvent.setup>) {
    renderConsole();
    await screen.findAllByRole('article');
    await user.click(within(cardFor('Dermatology')).getByRole('button', { name: 'Cancel referral' }));
    return screen.findByRole('dialog', { name: 'Cancel referral' });
  }

  it('tells the admin the patient will be notified, and requires a reason', async () => {
    const user = userEvent.setup();
    const dialog = await openCancel(user);

    expect(within(dialog).getByText(/notifies the patient/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel referral' }));

    expect(within(dialog).getByText(/Give a reason/)).toBeInTheDocument();
    expect(referralsService.cancelReferral).not.toHaveBeenCalled();
  });

  it('cancels with the reason and confirms the patient is being notified', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.cancelReferral).mockResolvedValue({ ...NO_DOCTOR, status: 'expired' });
    const dialog = await openCancel(user);

    await user.type(within(dialog).getByLabelText('Reason for cancelling'), 'No dermatologist onboarded in region');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel referral' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(referralsService.cancelReferral).toHaveBeenCalledWith(
      'ref-nodoc',
      { reason: 'No dermatologist onboarded in region', expectedUpdatedAt: NO_DOCTOR.updatedAt },
      'admin-token',
    );
    expect(noticeText()).toMatch(/cancelled. docforum-core will notify the patient/);
  });

  it('handles a referral that was already resolved elsewhere', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.cancelReferral).mockRejectedValue(new ApiError('Referral not found', 404));
    const dialog = await openCancel(user);

    await user.type(within(dialog).getByLabelText('Reason for cancelling'), 'No dermatologist onboarded in region');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel referral' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(noticeText()).toMatch(/another admin, the doctor or the patient acted on it first/);
  });

  it('stays open after a network failure so the admin can retry safely', async () => {
    const user = userEvent.setup();
    vi.mocked(referralsService.cancelReferral)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ...NO_DOCTOR, status: 'expired' });
    const dialog = await openCancel(user);
    await user.type(within(dialog).getByLabelText('Reason for cancelling'), 'No dermatologist onboarded in region');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel referral' }));
    expect(await within(dialog).findByText(/Couldn't confirm the cancellation/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel referral' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(referralsService.cancelReferral).toHaveBeenCalledTimes(2);
  });

  it('never writes referral data to the console', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const user = userEvent.setup();
    vi.mocked(referralsService.cancelReferral).mockRejectedValue(new ApiError('Conflict', 409));
    const dialog = await openCancel(user);
    await user.type(within(dialog).getByLabelText('Reason for cancelling'), 'No dermatologist onboarded in region');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel referral' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('/admin/referrals route', () => {
  function renderApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/referrals']}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('is reachable by admins', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Stuck referrals' })).toBeInTheDocument();
  });

  it.each<Role>(['patient', 'doctor', 'facility'])('redirects a %s away without fetching anything', async (role) => {
    signIn(role);
    renderApp();

    await waitFor(() => expect(currentLocation()).toBe(`/${role}`));
    expect(screen.queryByRole('heading', { name: 'Stuck referrals' })).not.toBeInTheDocument();
    expect(referralsService.listStuckReferrals).not.toHaveBeenCalled();
  });
});
