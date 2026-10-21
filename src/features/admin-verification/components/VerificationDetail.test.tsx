import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { VerificationDetail } from './VerificationDetail';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import { auditKeys, verificationKeys } from '../../../query-keys';
import { invalidationScope } from '../../../invalidations';
import type { AuditEvent, CursorPage, VerificationDetail as Detail } from '../../../types/models';

vi.mock('../../../services/admin-verification-service');
vi.mock('../../../services/audit-service');

import * as verificationService from '../../../services/admin-verification-service';
import * as auditService from '../../../services/audit-service';

const getVerification = vi.mocked(verificationService.getVerification);
const decideVerification = vi.mocked(verificationService.decideVerification);
const requestDocumentUrl = vi.mocked(verificationService.requestDocumentUrl);
const listAuditEvents = vi.mocked(auditService.listAuditEvents);

const DOC_ID = 'doc-1';

const DETAIL: Detail = {
  profile: {
    id: DOC_ID,
    fullName: 'Dr Ada Example',
    email: 'ada@example.test',
    verificationStatus: 'pending',
    specialties: ['Cardiology'],
    submittedAt: '2026-10-12T09:00:00.000Z',
    createdAt: '2026-10-12T09:00:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  },
  documents: [
    { id: 'file-1', fileName: 'medical-license.pdf', contentType: 'application/pdf', sizeBytes: 204_800, uploadedAt: '2026-10-12T09:05:00.000Z' },
  ],
};

function auditEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'evt-1',
    actorUserId: 'admin-9',
    actorRole: 'admin',
    entityType: 'DoctorProfile',
    entityId: DOC_ID,
    action: 'doctor.verification_status_changed',
    fromState: 'pending',
    toState: 'verified',
    requestId: null,
    metadata: null,
    createdAt: '2026-10-14T11:00:00.000Z',
    ...overrides,
  };
}

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Seed the queue so invalidation assertions have something to observe.
  queryClient.setQueryData(verificationKeys.list(), { pages: [], pageParams: [] });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <VerificationDetail doctorProfileId={DOC_ID} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: 'admin-token',
    user: { id: 'admin-1', email: 'admin@docforum.org', role: 'admin', createdAt: '', updatedAt: '' },
  });
  getVerification.mockResolvedValue(DETAIL);
  listAuditEvents.mockResolvedValue({ items: [], nextCursor: null } as CursorPage<AuditEvent>);
  decideVerification.mockResolvedValue({ id: DOC_ID, userId: 'u-1', fullName: DETAIL.profile.fullName, verificationStatus: 'rejected' });
});

describe('VerificationDetail — reviewing', () => {
  it('renders the profile, submitted date and document count', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Dr Ada Example' })).toBeInTheDocument();
    expect(screen.getByText(/Cardiology/)).toBeInTheDocument();
    expect(screen.getByText(/1 submitted/)).toBeInTheDocument();
    expect(screen.getByText(/Pending review/)).toBeInTheDocument();
  });

  it('requires a reason before a reject can be submitted, then records it', async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/keeps this doctor out of patient search/i);

    // Too-short reason → inline validation, nothing sent.
    await user.type(screen.getByLabelText(/Reason \(required\)/), 'no');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 10 characters/);
    expect(decideVerification).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText(/Reason \(required\)/));
    await user.type(screen.getByLabelText(/Reason \(required\)/), '  Credentials   could not be verified.  ');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));

    await waitFor(() =>
      expect(decideVerification).toHaveBeenCalledWith(
        DOC_ID,
        {
          status: 'rejected',
          reason: 'Credentials could not be verified.',
          expectedUpdatedAt: '2026-10-19T10:00:00.000Z',
        },
        'admin-token',
      ),
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByRole('status')).toHaveTextContent(/Rejected — the decision was recorded/);
  });

  it('handles two admins reviewing the same doctor: conflict closes and reloads', async () => {
    decideVerification.mockRejectedValue(new ApiError('Conflict', 409));
    const user = userEvent.setup();
    const queryClient = renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(screen.getByLabelText(/Reason \(required\)/), 'Approved after checking the register.');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    // The dialog closes, explains, and everything the screen shows reloads.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByRole('status')).toHaveTextContent(/Another admin reviewed this doctor first/);
    await waitFor(() => expect(getVerification).toHaveBeenCalledTimes(2));
    // The pending queue (inactive here) was marked for refresh, and the
    // history scope comes from the shared invalidation map.
    expect(queryClient.getQueryState(verificationKeys.list())?.isInvalidated).toBe(true);
    expect(invalidationScope('admin.verification.decision', DOC_ID)).toContainEqual(auditKeys.all);
  });

  it('keeps the dialog open with the server message on a refusal', async () => {
    decideVerification.mockRejectedValue(new ApiError('Reason too vague', 422));
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.type(screen.getByLabelText(/Reason \(required\)/), 'Approved after checking the register.');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/refused the decision: Reason too vague/);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not offer approving a doctor already verified', async () => {
    getVerification.mockResolvedValue({
      ...DETAIL,
      profile: { ...DETAIL.profile, verificationStatus: 'verified' },
    });
    renderDetail();
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeEnabled();
  });
});

describe('VerificationDetail — credential documents', () => {
  it('opens a document only through a fresh signed URL held in the view', async () => {
    requestDocumentUrl.mockResolvedValue({ url: 'https://files.example.test/signed/abc', expiresAt: '2100-01-01T00:00:00.000Z' });
    const user = userEvent.setup();
    renderDetail();

    expect(screen.queryByRole('link', { name: /Open medical-license/ })).toBeNull();
    await user.click(await screen.findByRole('button', { name: 'Get secure link' }));

    const link = await screen.findByRole('link', { name: /Open medical-license/ });
    expect(link).toHaveAttribute('href', 'https://files.example.test/signed/abc');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(requestDocumentUrl).toHaveBeenCalledWith(DOC_ID, 'file-1', 'admin-token');

    // Re-requesting replaces the link rather than reusing it.
    requestDocumentUrl.mockResolvedValue({ url: 'https://files.example.test/signed/xyz', expiresAt: '2100-01-01T00:00:00.000Z' });
    await user.click(screen.getByRole('button', { name: 'Get a new secure link' }));
    await waitFor(() => expect(screen.getByRole('link', { name: /Open medical-license/ })).toHaveAttribute('href', 'https://files.example.test/signed/xyz'));
  });

  it('explains a document that is gone (404)', async () => {
    requestDocumentUrl.mockRejectedValue(new ApiError('Not found', 404));
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole('button', { name: 'Get secure link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/resubmit their credentials/);
  });
});

describe('VerificationDetail — decision history', () => {
  it('renders verification decisions from the audit trail and skips other events', async () => {
    listAuditEvents.mockResolvedValue({
      items: [
        auditEvent(),
        auditEvent({ id: 'evt-2', action: 'doctor.profile_updated', fromState: null, toState: null }),
        auditEvent({ id: 'evt-3', fromState: 'verified', toState: 'rejected', createdAt: '2026-10-16T08:00:00.000Z' }),
      ],
      nextCursor: null,
    });
    renderDetail();

    expect(await screen.findByText('Pending review → Verified')).toBeInTheDocument();
    expect(screen.getByText('Verified → Rejected')).toBeInTheDocument();
    expect(screen.queryByText(/profile_updated/)).toBeNull();
    expect(listAuditEvents).toHaveBeenCalledWith(
      { entityType: 'DoctorProfile', entityId: DOC_ID, limit: 50 },
      'admin-token',
      expect.anything(),
    );
  });

  it('degrades to a notice when the audit trail is unavailable', async () => {
    listAuditEvents.mockRejectedValue(new ApiError('Forbidden', 403));
    renderDetail();

    expect(await screen.findByText(/decision history is unavailable/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Dr Ada Example' })).toBeInTheDocument();
    expect(screen.getByText('medical-license.pdf')).toBeInTheDocument();
  });

  it('says the rest of the page is current when the trail fails for other reasons', async () => {
    listAuditEvents.mockRejectedValue(new ApiError('Not found', 404));
    renderDetail();

    expect(await screen.findByText(/Everything else on this page is still current/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dr Ada Example' })).toBeInTheDocument();
  });
});
