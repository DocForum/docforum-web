import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { VerificationsQueue } from './VerificationsQueue';
import { VerificationDetail } from './VerificationDetail';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { CursorPage, VerificationDetail as Detail, VerificationQueueItem } from '../../../types/models';

vi.mock('../../../services/admin-verification-service');
vi.mock('../../../services/audit-service');

import * as verificationService from '../../../services/admin-verification-service';
import * as auditService from '../../../services/audit-service';

const listVerifications = vi.mocked(verificationService.listVerifications);
const getVerification = vi.mocked(verificationService.getVerification);
const decideVerification = vi.mocked(verificationService.decideVerification);
const listAuditEvents = vi.mocked(auditService.listAuditEvents);

const OLDER: VerificationQueueItem = {
  doctorProfileId: 'doc-older',
  fullName: 'Dr Older',
  specialties: ['Cardiology'],
  submittedAt: '2026-10-10T09:00:00.000Z',
  documentCount: 3,
  verificationStatus: 'pending',
};
const NEWER: VerificationQueueItem = {
  doctorProfileId: 'doc-newer',
  fullName: 'Dr Newer',
  specialties: ['Dermatology'],
  submittedAt: '2026-10-19T09:00:00.000Z',
  documentCount: 1,
  verificationStatus: 'pending',
};

function detailFor(item: VerificationQueueItem): Detail {
  return {
    profile: {
      id: item.doctorProfileId,
      fullName: item.fullName,
      email: 'doctor@example.test',
      verificationStatus: item.verificationStatus,
      specialties: item.specialties,
      submittedAt: item.submittedAt,
      createdAt: item.submittedAt,
      updatedAt: '2026-10-19T10:00:00.000Z',
    },
    documents: [
      { id: 'doc-1', fileName: 'license.pdf', contentType: 'application/pdf', sizeBytes: 2048, uploadedAt: item.submittedAt },
    ],
  };
}

function page(items: VerificationQueueItem[]): CursorPage<VerificationQueueItem> {
  return { items, nextCursor: null };
}

function DetailRoute() {
  const { doctorProfileId } = useParams<{ doctorProfileId: string }>();
  return <VerificationDetail doctorProfileId={doctorProfileId!} />;
}

function renderQueue() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/verifications']}>
        <Routes>
          <Route path="/admin/verifications" element={<VerificationsQueue />} />
          <Route path="/admin/verifications/:doctorProfileId" element={<DetailRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

let decisionStatus: 'pending' | 'verified' | 'rejected' = 'pending';

beforeEach(() => {
  vi.clearAllMocks();
  decisionStatus = 'pending';
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: 'admin-1', email: 'admin@docforum.org', role: 'admin', createdAt: '', updatedAt: '' },
  });
  listAuditEvents.mockResolvedValue({ items: [], nextCursor: null });
  getVerification.mockImplementation(async () => detailFor({ ...OLDER, verificationStatus: decisionStatus }));
  decideVerification.mockImplementation(async (_id, input) => {
    decisionStatus = input.status;
    return {
      id: _id,
      userId: 'u-1',
      fullName: 'Dr Older',
      verificationStatus: input.status,
    };
  });
});

describe('VerificationsQueue', () => {
  it('lists pending doctors oldest first with submitted date and document count', async () => {
    listVerifications.mockResolvedValue(page([NEWER, OLDER]));
    renderQueue();

    expect(await screen.findByText('Dr Older')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Dr Older');
    expect(rows[1]).toHaveTextContent('Dr Newer');
    expect(screen.getByText(/3 documents/)).toBeInTheDocument();
    expect(screen.getByText(/Submitted Oct 10, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/days waiting/)).toBeInTheDocument();
  });

  it('shows a distinct empty state when nobody is waiting', async () => {
    listVerifications.mockResolvedValue(page([]));
    renderQueue();
    expect(await screen.findByText(/No doctors are waiting for review/)).toBeInTheDocument();
  });

  it('explains a dead session and offers a retry on failure', async () => {
    listVerifications.mockRejectedValue(new ApiError('Forbidden', 403));
    renderQueue();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/no longer has admin access/);
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });

  it('approving removes the doctor from the pending list (list updates)', async () => {
    listVerifications.mockResolvedValueOnce(page([OLDER, NEWER]));
    const user = userEvent.setup();
    const queryClient = renderQueue();

    await user.click((await screen.findAllByRole('link', { name: 'Review' }))[0]);

    // Detail: approve with a required reason.
    expect(await screen.findByRole('heading', { name: 'Dr Older' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(within(dialog).getByLabelText(/Reason \(required\)/), 'Credentials verified against the register.');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(decideVerification).toHaveBeenCalledWith('doc-older', {
        status: 'verified',
        reason: 'Credentials verified against the register.',
        expectedUpdatedAt: '2026-10-19T10:00:00.000Z',
      }, 'admin-token'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/Approved — the decision was recorded/);

    // The pending list was marked for refresh while it is still off screen…
    await waitFor(() => expect(queryClient.getQueryState(['admin', 'verifications', 'list'])?.isInvalidated).toBe(true));

    // Back to the queue: the invalidated list refetches without the approved doctor.
    listVerifications.mockResolvedValue(page([NEWER]));
    await user.click(screen.getAllByRole('link', { name: /Back to the queue/ })[0]);

    await waitFor(() => expect(screen.queryByText('Dr Older')).toBeNull());
    expect(screen.getByText('Dr Newer')).toBeInTheDocument();
    expect(listVerifications).toHaveBeenCalledTimes(2);
  });
});
