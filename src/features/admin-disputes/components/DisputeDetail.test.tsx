import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DisputeDetail } from './DisputeDetail';
import { ApiError } from '../../../services/api-client';
import * as disputesService from '../../../services/disputes-service';
import { useAuthStore } from '../../../store/auth-store';
import type { FulfillmentDispute, Role } from '../../../types/models';

vi.mock('../../../services/disputes-service');

function signIn(role: Role = 'admin') {
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

const OPEN_DISPUTE: FulfillmentDispute = {
  id: 'dsp-1',
  status: 'open',
  orderId: 'ord-demo-rx-1',
  orderType: 'prescription',
  itemName: 'Demo Amoxicillin 500mg (fake)',
  patientName: 'Pat Placeholder',
  facility: { id: 'fac-1', name: 'Demo Pharmacy (fake)' },
  amountStroops: '500000000',
  asset: 'XLM',
  reason: 'not_received',
  openedAt: '2026-10-14T08:15:00.000Z',
  updatedAt: '2026-10-15T10:20:00.000Z',
  patientReport: {
    reason: 'not_received',
    description: 'Nothing arrived and the courier has no record of the parcel.',
    submittedAt: '2026-10-14T08:15:00.000Z',
    submittedBy: 'Pat Placeholder',
  },
  facilityProof: {
    reference: 'DR-2041 (fake)',
    note: 'Signed out at the counter.',
    submittedAt: '2026-10-15T10:20:00.000Z',
    submittedBy: 'Mo Example (fake)',
    attachments: [
      {
        id: 'att-1',
        filename: 'dispensing-record-demo.pdf',
        contentType: 'application/pdf',
        sizeBytes: 184_320,
        kind: 'dispensing_record',
        uploadedAt: '2026-10-15T10:18:00.000Z',
        uploadedBy: 'Mo Example (fake)',
      },
    ],
  },
  payment: { intentId: 'pin-1', status: 'escrowed', escrowId: 'esc-1 (fake)' },
  timeline: [
    {
      id: 'tl-1',
      at: '2026-10-14T08:15:00.000Z',
      actorRole: 'patient',
      actorName: 'Pat Placeholder',
      kind: 'opened',
      summary: 'Dispute opened: order not received.',
    },
    {
      id: 'tl-2',
      at: '2026-10-15T10:20:00.000Z',
      actorRole: 'facility',
      actorName: 'Mo Example (fake)',
      kind: 'proof_submitted',
      summary: 'Facility submitted proof.',
    },
  ],
  resolvedAt: null,
  resolution: null,
  resolutionNotes: null,
  resolvedBy: null,
};

const RESOLVED_FACILITY: FulfillmentDispute = {
  ...OPEN_DISPUTE,
  status: 'resolved_facility',
  payment: { ...OPEN_DISPUTE.payment, status: 'released' },
  resolution: 'facility',
  resolutionNotes: 'Proof matches the courier handover.',
  resolvedAt: '2026-10-16T09:00:00.000Z',
  resolvedBy: 'Admin (mock)',
  updatedAt: '2026-10-16T09:00:00.000Z',
};

function renderDetail(dispute: FulfillmentDispute = OPEN_DISPUTE, mockGet = true) {
  if (mockGet) vi.mocked(disputesService.getDispute).mockResolvedValue(dispute);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/disputes/${dispute.id}`]}>
        <DisputeDetail disputeId={dispute.id} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>, choice: 'facility' | 'patient') {
  await user.click(await screen.findByRole('button', { name: `Resolve for ${choice}` }));
  const dialog = await screen.findByRole('alertdialog');
  return dialog;
}

async function fillConfirmation(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, notes: string) {
  await user.type(within(dialog).getByLabelText('Resolution notes'), notes);
  await user.click(within(dialog).getByRole('checkbox', { name: /I understand this is final/ }));
}

describe('DisputeDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn();
  });

  it('shows the report, proof and timeline for an open dispute', async () => {
    renderDetail();

    expect(await screen.findByRole('heading', { name: 'Demo Amoxicillin 500mg (fake)' })).toBeInTheDocument();
    expect(screen.getByText('Nothing arrived and the courier has no record of the parcel.')).toBeInTheDocument();
    expect(screen.getByText('DR-2041 (fake)')).toBeInTheDocument();
    expect(screen.getByText('dispensing-record-demo.pdf')).toBeInTheDocument();
    expect(screen.getByText('Dispute opened: order not received.')).toBeInTheDocument();
    expect(screen.getByText('Facility submitted proof.')).toBeInTheDocument();
    expect(screen.getByText(/Payment release is blocked/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolve this dispute' })).toBeInTheDocument();
  });

  it('warns when the facility has submitted no proof', async () => {
    renderDetail({ ...OPEN_DISPUTE, facilityProof: null });

    expect(await screen.findByText(/has not submitted proof yet/)).toBeInTheDocument();
  });

  it('opens attachments through a freshly signed URL each time', async () => {
    vi.mocked(disputesService.getAttachmentSignedUrl)
      .mockResolvedValueOnce({
        url: 'https://files.example.test/one?signature=first',
        expiresAt: new Date(Date.now() + 3 * 60_000).toISOString(),
      })
      .mockResolvedValueOnce({
        url: 'https://files.example.test/two?signature=second',
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      });
    const user = userEvent.setup();

    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Get secure link' }));

    const firstLink = await screen.findByRole('link', { name: 'Open dispensing-record-demo.pdf' });
    expect(firstLink).toHaveAttribute('href', 'https://files.example.test/one?signature=first');
    expect(firstLink).toHaveAttribute('target', '_blank');
    expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/expires in/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Get a new secure link' }));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Open dispensing-record-demo.pdf' })).toHaveAttribute(
        'href',
        'https://files.example.test/two?signature=second',
      ),
    );
    expect(disputesService.getAttachmentSignedUrl).toHaveBeenCalledTimes(2);
    expect(disputesService.getAttachmentSignedUrl).toHaveBeenCalledWith('dsp-1', 'att-1', 'admin-token');
  });

  it('reports an expired or missing attachment without blanking the page', async () => {
    vi.mocked(disputesService.getAttachmentSignedUrl).mockRejectedValue(new ApiError('gone', 404));
    const user = userEvent.setup();

    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Get secure link' }));
    expect(await screen.findByText(/This attachment is no longer available/)).toBeInTheDocument();
    expect(screen.getByText('dispensing-record-demo.pdf')).toBeInTheDocument();
  });

  it('shows the payment consequence before resolving for the facility, then submits', async () => {
    vi.mocked(disputesService.resolveDispute).mockResolvedValue(RESOLVED_FACILITY);
    const user = userEvent.setup();

    renderDetail();
    const dialog = await openDialog(user, 'facility');

    expect(within(dialog).getByText('Release 50 XLM from escrow to Demo Pharmacy (fake).')).toBeInTheDocument();
    expect(within(dialog).getByText(/Pat Placeholder is not refunded/)).toBeInTheDocument();
    expect(within(dialog).getAllByText(/cannot be undone/).length).toBeGreaterThan(0);
    const confirm = within(dialog).getByRole('button', { name: 'Resolve for facility' });
    expect(confirm).toBeDisabled();

    await fillConfirmation(user, dialog, 'Proof matches the courier handover');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(disputesService.resolveDispute).toHaveBeenCalledWith(
        'dsp-1',
        {
          resolution: 'facility',
          notes: 'Proof matches the courier handover',
          expectedUpdatedAt: '2026-10-15T10:20:00.000Z',
        },
        'admin-token',
      ),
    );
    expect(await screen.findByText(/Dispute resolved for the facility/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resolved for the facility' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolve this dispute' })).not.toBeInTheDocument();
  });

  it('shows the refund consequence for the patient and can be cancelled', async () => {
    const user = userEvent.setup();

    renderDetail();
    const dialog = await openDialog(user, 'patient');

    expect(within(dialog).getByText('Refund 50 XLM from escrow to Pat Placeholder.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Demo Pharmacy \(fake\) is not paid/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep dispute open' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(disputesService.resolveDispute).not.toHaveBeenCalled();
  });

  it('refuses short notes with an explanation instead of silently failing', async () => {
    const user = userEvent.setup();

    renderDetail();
    const dialog = await openDialog(user, 'facility');
    await fillConfirmation(user, dialog, 'Too short');

    await user.click(within(dialog).getByRole('button', { name: 'Resolve for facility' }));

    expect(within(dialog).getByText(/Add at least 10 characters/)).toBeInTheDocument();
    expect(disputesService.resolveDispute).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('closes and reloads when another admin resolved the dispute first', async () => {
    vi.mocked(disputesService.resolveDispute).mockRejectedValue(new ApiError('already resolved', 409));
    const user = userEvent.setup();

    renderDetail();
    const dialog = await openDialog(user, 'facility');
    await fillConfirmation(user, dialog, 'Proof matches the courier handover');
    await user.click(within(dialog).getByRole('button', { name: 'Resolve for facility' }));

    expect(await screen.findByText(/another admin resolved it first/)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(disputesService.getDispute).toHaveBeenCalledTimes(2));
  });

  it('stops offering a retry when a network failure leaves the outcome unknown', async () => {
    vi.mocked(disputesService.resolveDispute).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();

    renderDetail();
    const dialog = await openDialog(user, 'patient');
    await fillConfirmation(user, dialog, 'Patient says the medicine was damaged');
    await user.click(within(dialog).getByRole('button', { name: 'Resolve for patient' }));

    expect(await within(dialog).findByText(/may or may not have been applied/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Resolve for patient' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close and reload dispute' })).toBeInTheDocument();
    expect(disputesService.resolveDispute).toHaveBeenCalledTimes(1);

    await user.click(within(dialog).getByRole('button', { name: 'Close and reload dispute' }));
    await waitFor(() => expect(disputesService.getDispute).toHaveBeenCalledTimes(2));
  });

  it('shows a closed dispute as final with no resolution actions', async () => {
    renderDetail(RESOLVED_FACILITY);

    expect(await screen.findByRole('heading', { name: 'Resolved for the facility' })).toBeInTheDocument();
    expect(screen.getByText('50 XLM was released from escrow to Demo Pharmacy (fake).')).toBeInTheDocument();
    expect(screen.getByText(/Proof matches the courier handover/)).toBeInTheDocument();
    expect(screen.getByText(/Resolved by Admin \(mock\)/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolve this dispute' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolve for/ })).not.toBeInTheDocument();
  });

  it('reports a missing dispute without pretending the queue is empty', async () => {
    vi.mocked(disputesService.getDispute).mockRejectedValue(new ApiError('missing', 404));

    renderDetail(OPEN_DISPUTE, false);

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer exists/);
    expect(screen.getByRole('link', { name: /All disputes/ })).toHaveAttribute('href', '/admin/disputes');
  });
});
