import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../../App';
import { SpecialtyClaimsConsole } from './SpecialtyClaimsConsole';
import { ApiError } from '../../../services/api-client';
import * as verificationService from '../../../services/admin-verification-service';
import { useAuthStore } from '../../../store/auth-store';
import type { Role, Specialty, SpecialtyClaim } from '../../../types/models';

vi.mock('../../../services/admin-verification-service');

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

const CARDIOLOGY: Specialty = { id: 'spec-cardio', name: 'Cardiology', slug: 'cardiology' };
const NEUROLOGY: Specialty = { id: 'spec-neuro', name: 'Neurology', slug: 'neurology' };
const DERMATOLOGY: Specialty = { id: 'spec-derm', name: 'Dermatology', slug: 'dermatology' };

const GP = { id: 'doc-gp', fullName: 'Dr. Grace Park' };
const SPECIALIST = { id: 'doc-spec', fullName: 'Dr. Nia Shah' };

function claim(
  overrides: Partial<SpecialtyClaim> & Pick<SpecialtyClaim, 'id' | 'doctorId' | 'createdAt'>,
): SpecialtyClaim {
  return {
    doctor: overrides.doctorId === GP.id ? GP : SPECIALIST,
    specialtyId: CARDIOLOGY.id,
    specialty: CARDIOLOGY,
    status: 'pending',
    credential: {
      id: `crd-${overrides.id}`,
      fileName: 'board-certification-demo.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 245_760,
      uploadedAt: overrides.createdAt,
    },
    rejectionReason: null,
    reviewedById: null,
    reviewedByName: null,
    reviewedAt: null,
    updatedAt: overrides.createdAt,
    ...overrides,
  };
}

// The GP claims cardiology without a credential — the PRD §8.1.5 failure.
const GP_CARDIO = claim({ id: 'dsc-1', doctorId: GP.id, createdAt: hoursAgo(96) });
const GP_NEURO = claim({
  id: 'dsc-2',
  doctorId: GP.id,
  createdAt: hoursAgo(10),
  specialtyId: NEUROLOGY.id,
  specialty: NEUROLOGY,
  credential: null,
});
const SPEC_DERM = claim({
  id: 'dsc-3',
  doctorId: SPECIALIST.id,
  createdAt: hoursAgo(30),
  specialtyId: DERMATOLOGY.id,
  specialty: DERMATOLOGY,
});

const VALID_REASON = 'Upload your cardiology board certification to resubmit.';

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

function renderConsole(path = '/admin/verification') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <SpecialtyClaimsConsole />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const currentLocation = () => screen.getByTestId('location').textContent;
// Not getByRole('status'): the location probe's <output> has that role too.
const noticeText = () => document.querySelector('section [role="status"]')?.textContent;
  const cardFor = (doctor: string) =>
  screen.getAllByRole('article').find((card) => within(card).queryByRole('heading', { level: 2, name: doctor }))!;

async function openReview(
  user: ReturnType<typeof userEvent.setup>,
  doctor: string,
  action: 'Approve' | 'Reject',
) {
  renderConsole();
  await screen.findAllByRole('article');
  await user.click(within(cardFor(doctor)).getAllByRole('button', { name: action })[0]);
  return screen.findByRole('dialog', { name: 'Review specialty claim' });
}

beforeEach(() => {
  signIn('admin');
  vi.mocked(verificationService.listSpecialtyClaims).mockReset();
  vi.mocked(verificationService.listSpecialties).mockReset();
  vi.mocked(verificationService.reviewSpecialtyClaim).mockReset();
  vi.mocked(verificationService.fetchClaimCredential).mockReset();
  // Deliberately out of order — the console groups and sorts oldest first itself.
  vi.mocked(verificationService.listSpecialtyClaims).mockResolvedValue({
    items: [GP_NEURO, SPEC_DERM, GP_CARDIO],
    nextCursor: null,
  });
  vi.mocked(verificationService.listSpecialties).mockResolvedValue([CARDIOLOGY, NEUROLOGY, DERMATOLOGY]);
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('SpecialtyClaimsConsole — queue', () => {
  it('groups claims by doctor with the supporting document beside each claim', async () => {
    renderConsole();

    const cards = await screen.findAllByRole('article');
    // Dr. Grace Park's oldest claim (96 h) predates Dr. Nia Shah's (30 h).
    expect(cards.map((card) => within(card).getByRole('heading', { level: 2 }).textContent)).toEqual([
      'Dr. Grace Park',
      'Dr. Nia Shah',
    ]);

    const gpCard = cardFor('Dr. Grace Park');
    expect(within(gpCard).getByText('2 pending claims')).toBeInTheDocument();
    const claimHeadings = within(gpCard).getAllByRole('heading', { level: 3 });
    expect(claimHeadings.map((h) => h.textContent)).toEqual(['Cardiology', 'Neurology']);
    expect(within(gpCard).getByText('Claimed 4 days ago')).toBeInTheDocument();
    // The cardiology claim has its credential right there…
    expect(within(gpCard).getByText('board-certification-demo.pdf')).toBeInTheDocument();
    expect(within(gpCard).getByRole('button', { name: 'View document' })).toBeInTheDocument();
    // …the neurology claim doesn't, and the UI says so instead of hiding it.
    expect(within(gpCard).getByText(/No supporting document was attached/)).toBeInTheDocument();

    expect(within(cardFor('Dr. Nia Shah')).getByText('Dermatology')).toBeInTheDocument();

    expect(verificationService.listSpecialtyClaims).toHaveBeenCalledWith(
      { specialtyId: null, olderThan: null, cursor: null },
      'admin-token',
      expect.anything(),
    );
  });

  it('filters by specialty through the URL and refetches', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    await user.selectOptions(screen.getByLabelText('Specialty'), 'spec-neuro');

    await waitFor(() => expect(currentLocation()).toBe('/admin/verification?specialtyId=spec-neuro'));
    await waitFor(() =>
      expect(vi.mocked(verificationService.listSpecialtyClaims).mock.lastCall?.[0]).toEqual({
        specialtyId: 'spec-neuro',
        olderThan: null,
        cursor: null,
      }),
    );
  });

  it('filters by claim age through the URL and refetches', async () => {
    const user = userEvent.setup();
    renderConsole();
    await screen.findAllByRole('article');

    await user.selectOptions(screen.getByLabelText('Claimed at least'), '3 days');

    await waitFor(() => expect(currentLocation()).toBe('/admin/verification?olderThan=72h'));
    await waitFor(() =>
      expect(vi.mocked(verificationService.listSpecialtyClaims).mock.lastCall?.[0]).toEqual({
        specialtyId: null,
        olderThan: '72h',
        cursor: null,
      }),
    );
  });

  it('reads filters straight from a shared URL', async () => {
    renderConsole('/admin/verification?specialtyId=spec-derm&olderThan=24h');
    await screen.findAllByRole('article');

    expect(screen.getByLabelText('Specialty')).toHaveValue('spec-derm');
    expect(screen.getByLabelText('Claimed at least')).toHaveValue('24h');
    expect(vi.mocked(verificationService.listSpecialtyClaims).mock.lastCall?.[0]).toEqual({
      specialtyId: 'spec-derm',
      olderThan: '24h',
      cursor: null,
    });
  });

  it('loads the next page on request', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.listSpecialtyClaims).mockImplementation(async (query) =>
      query.cursor === 'page-2'
        ? { items: [SPEC_DERM], nextCursor: null }
        : { items: [GP_CARDIO], nextCursor: 'page-2' },
    );
    renderConsole();
    await screen.findAllByRole('article');

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says so when the queue is empty', async () => {
    vi.mocked(verificationService.listSpecialtyClaims).mockResolvedValue({ items: [], nextCursor: null });
    renderConsole();

    expect(await screen.findByText(/No specialty claims are waiting for review/)).toBeInTheDocument();
  });

  it('distinguishes an empty filtered view from an empty queue', async () => {
    vi.mocked(verificationService.listSpecialtyClaims).mockResolvedValue({ items: [], nextCursor: null });
    renderConsole('/admin/verification?olderThan=168h');

    expect(await screen.findByText('No pending claims match these filters.')).toBeInTheDocument();
  });

  it("explains when docforum-core doesn't serve the queue yet", async () => {
    vi.mocked(verificationService.listSpecialtyClaims).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    expect(await screen.findByRole('alert')).toHaveTextContent(/per-specialty verification yet \(docforum-core#51\)/);
  });
});

describe('SpecialtyClaimsConsole — credentials', () => {
  it('opens the credential bytes in a new tab without putting a token in a URL', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['%PDF-1.4 demo'], { type: 'application/pdf' });
    vi.mocked(verificationService.fetchClaimCredential).mockResolvedValue(blob);
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const createObjectURL = vi.fn(() => 'blob:mock-credential');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));

    renderConsole();
    await screen.findAllByRole('article');
    await user.click(within(cardFor('Dr. Grace Park')).getByRole('button', { name: 'View document' }));

    await waitFor(() => expect(verificationService.fetchClaimCredential).toHaveBeenCalledWith('dsc-1', 'admin-token'));
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(open).toHaveBeenCalledWith('blob:mock-credential', '_blank', 'noopener');
  });

  it('reports a blocked popup instead of failing silently', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.fetchClaimCredential).mockResolvedValue(new Blob(['x']));
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: vi.fn() }));

    renderConsole();
    await screen.findAllByRole('article');
    await user.click(within(cardFor('Dr. Grace Park')).getByRole('button', { name: 'View document' }));

    expect(await screen.findByText(/browser blocked the new tab/)).toBeInTheDocument();
  });
});

describe('SpecialtyClaimsConsole — approve', () => {
  it('approves with an optional note and the version the admin saw, then refreshes', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim).mockResolvedValue({ ...GP_CARDIO, status: 'verified' });
    const dialog = await openReview(user, 'Dr. Grace Park', 'Approve');
    const listCalls = vi.mocked(verificationService.listSpecialtyClaims).mock.calls.length;

    // The approval note is optional — submitting with it empty must work.
    await user.click(within(dialog).getByRole('button', { name: 'Approve claim' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(verificationService.reviewSpecialtyClaim).toHaveBeenCalledWith(
      'dsc-1',
      { decision: 'approve', reason: null, expectedUpdatedAt: GP_CARDIO.updatedAt },
      'admin-token',
    );
    expect(noticeText()).toMatch(/approved for Dr. Grace Park/);
    const notice = screen.getByText(/approved for Dr. Grace Park/).closest<HTMLElement>('[role="status"]')!;
    expect(within(notice).getByRole('link', { name: 'View in audit trail' })).toHaveAttribute(
      'href',
      '/admin/audit?entityType=DoctorSpecialty&entityId=dsc-1',
    );
    await waitFor(() => expect(verificationService.listSpecialtyClaims).toHaveBeenCalledTimes(listCalls + 1));
  });

  it('switches from approve to reject before submitting', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim).mockResolvedValue({ ...GP_CARDIO, status: 'rejected' });
    const dialog = await openReview(user, 'Dr. Grace Park', 'Approve');

    await user.click(within(dialog).getByRole('radio', { name: 'Reject' }));
    await within(dialog).getByRole('button', { name: 'Reject claim' });
    expect(within(dialog).getByText(/The doctor is told your reason/)).toBeInTheDocument();
  });
});

describe('SpecialtyClaimsConsole — reject', () => {
  it('requires an actionable reason before sending anything', async () => {
    const user = userEvent.setup();
    const dialog = await openReview(user, 'Dr. Grace Park', 'Reject');

    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));
    expect(within(dialog).getByText('Give a reason — the doctor is told what to fix or resubmit.')).toBeInTheDocument();
    expect(verificationService.reviewSpecialtyClaim).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Reason sent to the doctor/), 'cert');
    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));
    expect(within(dialog).getByText('Write at least 10 characters.')).toBeInTheDocument();
    expect(verificationService.reviewSpecialtyClaim).not.toHaveBeenCalled();

    // The dialog spells out that the doctor reads this text.
    expect(within(dialog).getByText(/Required — say which credential is missing or invalid/)).toBeInTheDocument();
  });

  it('rejects with the reason and confirms the doctor is being told what to resubmit', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim).mockResolvedValue({ ...GP_CARDIO, status: 'rejected' });
    const dialog = await openReview(user, 'Dr. Grace Park', 'Reject');

    await user.type(within(dialog).getByLabelText(/Reason sent to the doctor/), `  ${VALID_REASON}  `);
    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(verificationService.reviewSpecialtyClaim).toHaveBeenCalledWith(
      'dsc-1',
      { decision: 'reject', reason: VALID_REASON, expectedUpdatedAt: GP_CARDIO.updatedAt },
      'admin-token',
    );
    expect(noticeText()).toMatch(/rejected for Dr. Grace Park. docforum-core tells the doctor what to resubmit/);
  });

  it('closes and refreshes when someone else reviewed the claim first', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim).mockRejectedValue(new ApiError('Conflict', 409));
    const dialog = await openReview(user, 'Dr. Grace Park', 'Reject');
    const listCalls = vi.mocked(verificationService.listSpecialtyClaims).mock.calls.length;

    await user.type(within(dialog).getByLabelText(/Reason sent to the doctor/), VALID_REASON);
    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(noticeText()).toMatch(/This claim changed while you were working on it/);
    await waitFor(() => expect(verificationService.listSpecialtyClaims).toHaveBeenCalledTimes(listCalls + 1));
  });

  it('keeps the dialog open when docforum-core refuses, so the admin can rewrite the reason', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim).mockRejectedValue(
      new ApiError('A rejection must tell the doctor what to fix', 422),
    );
    const dialog = await openReview(user, 'Dr. Grace Park', 'Reject');

    await user.type(within(dialog).getByLabelText(/Reason sent to the doctor/), VALID_REASON);
    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));

    expect(await within(dialog).findByText(/refused the rejection: A rejection must tell the doctor/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('stays open after a network failure so the admin can retry safely', async () => {
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ ...GP_CARDIO, status: 'rejected' });
    const dialog = await openReview(user, 'Dr. Grace Park', 'Reject');

    await user.type(within(dialog).getByLabelText(/Reason sent to the doctor/), VALID_REASON);
    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));
    expect(await within(dialog).findByText(/Couldn't confirm the rejection/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(verificationService.reviewSpecialtyClaim).toHaveBeenCalledTimes(2);
  });

  it('never writes claim data to the console', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const user = userEvent.setup();
    vi.mocked(verificationService.reviewSpecialtyClaim).mockRejectedValue(new ApiError('Conflict', 409));
    const dialog = await openReview(user, 'Dr. Grace Park', 'Reject');
    await user.type(within(dialog).getByLabelText(/Reason sent to the doctor/), VALID_REASON);
    await user.click(within(dialog).getByRole('button', { name: 'Reject claim' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });
});

describe('/admin/verification route', () => {
  function renderApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/verification']}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('is reachable by admins', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Specialty claims' })).toBeInTheDocument();
  });

  it.each<Role>(['patient', 'doctor', 'facility'])('redirects a %s away without fetching anything', async (role) => {
    signIn(role);
    renderApp();

    await waitFor(() => expect(currentLocation()).toBe(`/${role}`));
    expect(screen.queryByRole('heading', { name: 'Specialty claims' })).not.toBeInTheDocument();
    expect(verificationService.listSpecialtyClaims).not.toHaveBeenCalled();
  });
});
