import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DisputeDetailView } from './DisputeDetailView';
import { ApiError } from '../../../services/api-client';
import * as disputesService from '../../../services/admin-disputes-service';
import { useAuthStore } from '../../../store/auth-store';
import type { FulfillmentDisputeDetail } from '../../../types/models';

vi.mock('../../../services/admin-disputes-service');

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

function openDispute(overrides: Partial<FulfillmentDisputeDetail> = {}): FulfillmentDisputeDetail {
  return {
    id: 'dsp-1',
    orderId: 'ord-rx-1',
    orderType: 'prescription',
    orderItemName: 'Amoxicillin 500 mg capsules (30)',
    patientName: 'Pat Placeholder',
    facilityId: 'fac-1',
    facilityName: 'Central Pharmacy',
    amountStroops: '500000000',
    asset: 'XLM',
    status: 'open',
    openedAt: hoursAgo(50),
    updatedAt: '2026-10-16T11:30:00.000Z',
    reportExcerpt: 'The label says 250 mg but my prescription is for 500 mg.',
    attachmentCount: 2,
    patientReport:
      'The printed label says 250 mg three times a day, but my prescription says 500 mg. I took one dose before noticing.',
    facilityProof: 'Our dispensing log shows batch B-9912 was labelled at 500 mg.',
    attachments: [
      {
        id: 'att-1',
        fileName: 'dispensing-log.txt',
        contentType: 'text/plain',
        sizeBytes: 2048,
        uploadedAt: '2026-10-12T10:05:00.000Z',
        uploadedBy: 'facility',
      },
      {
        id: 'att-2',
        fileName: 'label-photo.png',
        contentType: 'image/png',
        sizeBytes: 184320,
        uploadedAt: '2026-10-12T10:06:00.000Z',
        uploadedBy: 'facility',
      },
    ],
    timeline: [
      {
        id: 'tl-1',
        kind: 'opened',
        at: '2026-10-11T09:15:00.000Z',
        actor: 'Pat Placeholder',
        actorRole: 'patient',
        summary: 'Reported a dose mismatch on the dispensed prescription.',
      },
      {
        id: 'tl-2',
        kind: 'facility_evidence',
        at: '2026-10-12T10:06:00.000Z',
        actor: 'Frank Facility',
        actorRole: 'facility',
        summary: 'Uploaded the dispensing log and a photo of the label.',
      },
    ],
    paymentIntentId: 'pin-1',
    escrowId: 'esc-1',
    resolution: null,
    resolutionNote: null,
    resolvedAt: null,
    resolvedBy: null,
    ...overrides,
  };
}

const RESOLVED = openDispute({
  status: 'resolved_facility',
  resolution: 'facility',
  resolutionNote: 'Batch and dose matched the prescription; escrow released.',
  resolvedAt: '2026-10-18T14:20:00.000Z',
  resolvedBy: 'Al Admin',
  updatedAt: '2026-10-18T14:20:00.000Z',
  timeline: [
    ...openDispute().timeline,
    {
      id: 'tl-3',
      kind: 'resolved',
      at: '2026-10-18T14:20:00.000Z',
      actor: 'Al Admin',
      actorRole: 'admin',
      summary: 'Resolved for the facility — escrow released.',
    },
  ],
});

function signInAdmin() {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: 'admin-1', email: 'admin@docforum.org', role: 'admin', createdAt: '', updatedAt: '' },
  });
}

function renderDetail(id = 'dsp-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/disputes/${id}`]}>
        <DisputeDetailView disputeId={id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openResolution(
  user: ReturnType<typeof userEvent.setup>,
  which: 'facility' | 'patient',
) {
  renderDetail();
  await screen.findByRole('heading', { name: 'Amoxicillin 500 mg capsules (30)' });
  await user.click(screen.getByRole('button', { name: `Resolve for ${which}` }));
  return screen.findByRole('dialog', {
    name: `Resolve for ${which}`,
  });
}

beforeEach(() => {
  signInAdmin();
  vi.mocked(disputesService.getDispute).mockReset();
  vi.mocked(disputesService.createAttachmentUrl).mockReset();
  vi.mocked(disputesService.resolveDispute).mockReset();
  vi.mocked(disputesService.getDispute).mockResolvedValue(openDispute());
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().clearSession();
});

describe('DisputeDetailView — evidence', () => {
  it('shows the report, facility proof, amount held and timeline', async () => {
    renderDetail();

    expect(
      await screen.findByRole('heading', { name: 'Amoxicillin 500 mg capsules (30)' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/printed label says 250 mg/)).toBeInTheDocument();
    expect(screen.getByText(/dispensing log shows batch B-9912/)).toBeInTheDocument();
    expect(screen.getByText('50 XLM')).toBeInTheDocument();
    expect(screen.getByText(/Payment release is blocked/)).toBeInTheDocument();
    expect(screen.getByText('dispensing-log.txt')).toBeInTheDocument();
    expect(screen.getByText('label-photo.png')).toBeInTheDocument();
    expect(screen.getByText(/Reported a dose mismatch/)).toBeInTheDocument();
    expect(screen.getByText(/Uploaded the dispensing log/)).toBeInTheDocument();
  });

  it('opens attachments with a freshly minted signed URL every time', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    vi.mocked(disputesService.createAttachmentUrl)
      .mockResolvedValueOnce({ url: 'https://files.example.test/one', expiresAt: '2026-10-19T10:05:00.000Z' })
      .mockResolvedValueOnce({ url: 'https://files.example.test/two', expiresAt: '2026-10-19T10:06:00.000Z' });
    renderDetail();
    await screen.findByRole('heading', { name: 'Amoxicillin 500 mg capsules (30)' });

    const button = screen.getByRole('button', { name: 'Open dispensing-log.txt' });
    await user.click(button);
    await waitFor(() =>
      expect(disputesService.createAttachmentUrl).toHaveBeenLastCalledWith(
        'dsp-1',
        'att-1',
        'admin-token',
      ),
    );
    expect(open).toHaveBeenLastCalledWith(
      'https://files.example.test/one',
      '_blank',
      'noopener,noreferrer',
    );

    await user.click(button);
    await waitFor(() => expect(disputesService.createAttachmentUrl).toHaveBeenCalledTimes(2));
    expect(open).toHaveBeenLastCalledWith(
      'https://files.example.test/two',
      '_blank',
      'noopener,noreferrer',
    );
    // The URL itself is never rendered into the page.
    expect(screen.queryByText(/files\.example\.test/)).not.toBeInTheDocument();
  });

  it('explains when an attachment link cannot be minted', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    vi.mocked(disputesService.createAttachmentUrl).mockRejectedValue(new ApiError('Gone', 404));
    renderDetail();
    await screen.findByRole('heading', { name: 'Amoxicillin 500 mg capsules (30)' });

    await user.click(screen.getByRole('button', { name: 'Open dispensing-log.txt' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/i);
    expect(open).not.toHaveBeenCalled();
  });
});

describe('DisputeDetailView — resolution', () => {
  it('shows the release consequence and requires a note and explicit acknowledgement', async () => {
    const user = userEvent.setup();
    const dialog = await openResolution(user, 'facility');

    expect(within(dialog).getByText(/This is final/)).toBeInTheDocument();
    expect(within(dialog).getAllByText('Release 50 XLM to Central Pharmacy').length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/releases the escrowed payment to the facility/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/patient is not refunded/i)).toBeInTheDocument();

    const submit = within(dialog).getByRole('button', { name: /Resolve for facility — release/ });
    expect(submit).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox'));
    expect(submit).toBeEnabled();

    await user.type(within(dialog).getByLabelText('Resolution note'), 'too short');
    await user.click(submit);
    expect(within(dialog).getByText('Write at least 10 characters.')).toBeInTheDocument();
    expect(disputesService.resolveDispute).not.toHaveBeenCalled();
  });

  it('resolves for the facility with the note and version, then locks the dispute', async () => {
    const user = userEvent.setup();
    vi.mocked(disputesService.resolveDispute).mockResolvedValue(RESOLVED);
    const dialog = await openResolution(user, 'facility');

    await user.type(
      within(dialog).getByLabelText('Resolution note'),
      '  Dispensing log and label photo   match the prescription.  ',
    );
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /Resolve for facility — release/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(disputesService.resolveDispute).toHaveBeenCalledWith(
      'dsp-1',
      {
        resolution: 'facility',
        note: 'Dispensing log and label photo match the prescription.',
        expectedUpdatedAt: '2026-10-16T11:30:00.000Z',
      },
      'admin-token',
    );
    expect(screen.getAllByText(/50 XLM released to Central Pharmacy/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/This is final/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Resolve for patient' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve for facility' })).not.toBeInTheDocument();
  });

  it('spells out the refund consequence for the patient side', async () => {
    const user = userEvent.setup();
    const dialog = await openResolution(user, 'patient');

    expect(within(dialog).getAllByText('Refund 50 XLM to Pat Placeholder').length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/refunds the escrowed payment to the patient/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/facility is not paid/i)).toBeInTheDocument();
  });

  it('shows a resolved dispute as final and offers no actions', async () => {
    vi.mocked(disputesService.getDispute).mockResolvedValue(RESOLVED);
    renderDetail();

    expect(await screen.findByText(/Batch and dose matched the prescription/)).toBeInTheDocument();
    const resolvedStatus = screen
      .getAllByRole('status')
      .find((element) => element.textContent?.includes('Resolved for facility'));
    expect(resolvedStatus).toBeDefined();
    expect(screen.getByText(/Resolved by Al Admin/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve for facility' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve for patient' })).not.toBeInTheDocument();
  });

  it('closes and refreshes when another admin resolved it first', async () => {
    const user = userEvent.setup();
    vi.mocked(disputesService.resolveDispute).mockRejectedValue(new ApiError('Already resolved', 409));
    const dialog = await openResolution(user, 'facility');
    const calls = vi.mocked(disputesService.getDispute).mock.calls.length;

    await user.type(within(dialog).getByLabelText('Resolution note'), 'Checked the evidence carefully.');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /Resolve for facility — release/ }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/another admin may have resolved it first/)).toBeInTheDocument();
    await waitFor(() =>
      expect(vi.mocked(disputesService.getDispute).mock.calls.length).toBeGreaterThan(calls),
    );
  });

  it('keeps the dialog open after an unconfirmed request so it can be retried', async () => {
    const user = userEvent.setup();
    vi.mocked(disputesService.resolveDispute)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(RESOLVED);
    const dialog = await openResolution(user, 'facility');
    await user.type(within(dialog).getByLabelText('Resolution note'), 'Checked the evidence carefully.');
    await user.click(within(dialog).getByRole('checkbox'));

    await user.click(within(dialog).getByRole('button', { name: /Resolve for facility — release/ }));
    expect(await within(dialog).findByText(/Couldn't confirm the resolution/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /Resolve for facility — release/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(disputesService.resolveDispute).toHaveBeenCalledTimes(2);
  });
});
