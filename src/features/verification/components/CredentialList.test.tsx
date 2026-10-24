import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { CredentialList } from './CredentialList';
import { useAuthStore } from '../../../store/auth-store';
import * as verificationService from '../../../services/doctor-verification-service';
import { MAX_CREDENTIAL_BYTES } from '../requirements';
import type { ClaimItemStatus, DoctorCredential } from '../../../types/models';

vi.mock('../../../services/doctor-verification-service');

function credential(overrides: Partial<DoctorCredential> = {}): DoctorCredential {
  return {
    id: 'dc-1',
    doctorProfileId: 'dp-1',
    type: 'medical_license',
    fileName: 'license.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2 * 1024 * 1024,
    status: 'pending',
    rejectionReason: null,
    submittedAt: '2026-01-05T00:00:00Z',
    updatedAt: '2026-01-05T00:00:00Z',
    ...overrides,
  };
}

function fileWith(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/** Table-driven: the review criterion is that every backend per-item state
 * renders, including a rejection with no reason string. */
const STATUS_ROWS: { status: ClaimItemStatus; label: string; rejected: boolean; removable: boolean }[] = [
  { status: 'pending', label: 'Pending review', rejected: false, removable: true },
  { status: 'verified', label: 'Verified', rejected: false, removable: false },
  { status: 'rejected', label: 'Rejected', rejected: true, removable: true },
];

function renderList(credentials: readonly DoctorCredential[]) {
  return render(<CredentialList credentials={credentials} isLoading={false} error={null} />);
}

describe('CredentialList', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(verificationService.deleteCredential).mockReset();
    vi.mocked(verificationService.resubmitCredential).mockReset();
  });

  it('describes each document with its name, type, size and file type', () => {
    renderList([credential()]);

    expect(screen.getByText('license.pdf')).toBeInTheDocument();
    expect(screen.getByText('Medical license')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getByText('application/pdf')).toBeInTheDocument();
  });

  it.each(STATUS_ROWS)('renders the $status state as "$label"', ({ status, label, rejected, removable }) => {
    const { container } = renderList([credential({ status })]);

    // The state is a word in the accessibility tree, never a colour alone.
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-status="${status}"]`)).not.toBeNull();

    const resubmit = screen.queryByRole('button', { name: /resubmit document/i });
    if (rejected) {
      expect(resubmit).not.toBeNull();
      expect(screen.getByText(/reason:/i)).toBeInTheDocument();
    } else {
      expect(resubmit).toBeNull();
      expect(screen.queryByText(/reason:/i)).toBeNull();
    }

    if (removable) {
      expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole('button', { name: /^remove$/i })).toBeNull();
    }
  });

  it('shows the reason the backend recorded for a rejection', () => {
    renderList([credential({ status: 'rejected', rejectionReason: 'The license number is not legible.' })]);

    expect(screen.getByText(/the license number is not legible/i)).toBeInTheDocument();
  });

  it('explains what to do when a rejection arrives without a reason', () => {
    renderList([credential({ status: 'rejected', rejectionReason: null })]);

    expect(screen.getByText(/no reason was recorded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resubmit document/i })).toBeInTheDocument();
  });

  // Review criterion: an uploaded document is never surfaced through a
  // permanent URL — even when the API response carries one.
  it('renders no link and no url when the response includes one', () => {
    const withUrl: DoctorCredential & { url: string; downloadUrl: string } = {
      ...credential(),
      url: 'https://core.example.com/files/dc-1/license.pdf?token=abc',
      downloadUrl: 'https://core.example.com/download/license.pdf',
    };
    const { container } = renderList([withUrl]);

    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(container.textContent).not.toContain('core.example.com');
    expect(screen.getByText('license.pdf')).toBeInTheDocument();
  });

  it('says reviewers open documents through a get-on-demand link', () => {
    renderList([credential()]);
    expect(screen.getByText(/get-on-demand/i)).toBeInTheDocument();
  });

  it('removes a document that is still pending', async () => {
    vi.mocked(verificationService.deleteCredential).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderList([credential({ id: 'dc-9' })]);

    await user.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() => expect(verificationService.deleteCredential).toHaveBeenCalledWith('dc-9', 'test-token'));
  });

  it('resubmits a rejected document as a replacement upload', async () => {
    vi.mocked(verificationService.resubmitCredential).mockResolvedValue(credential({ status: 'pending' }));
    const user = userEvent.setup();
    renderList([credential({ id: 'dc-3', status: 'rejected', rejectionReason: 'Expired.' })]);

    await user.click(screen.getByRole('button', { name: /resubmit document/i }));
    await user.upload(screen.getByLabelText(/replacement file for license.pdf/i), fileWith('license-v2.pdf', 'application/pdf', 1024));
    await user.click(screen.getByRole('button', { name: /resubmit for review/i }));

    await waitFor(() => expect(verificationService.resubmitCredential).toHaveBeenCalledTimes(1));
    const [credentialId, file, accessToken, handlers] = vi.mocked(verificationService.resubmitCredential).mock.calls[0];
    expect(credentialId).toBe('dc-3');
    expect(file.name).toBe('license-v2.pdf');
    expect(accessToken).toBe('test-token');
    expect(handlers).toHaveProperty('onProgress');
  });

  it('validates a replacement file before resubmitting', async () => {
    const user = userEvent.setup();
    renderList([credential({ id: 'dc-3', status: 'rejected' })]);

    await user.click(screen.getByRole('button', { name: /resubmit document/i }));
    await user.upload(
      screen.getByLabelText(/replacement file for license.pdf/i),
      fileWith('huge.pdf', 'application/pdf', MAX_CREDENTIAL_BYTES + 1),
    );
    await user.click(screen.getByRole('button', { name: /resubmit for review/i }));

    expect(await screen.findByText(/or smaller/i)).toBeInTheDocument();
    expect(verificationService.resubmitCredential).not.toHaveBeenCalled();
  });

  it('reports resubmission progress in real bytes', async () => {
    let onProgress: ((loaded: number, total: number) => void) | undefined;
    vi.mocked(verificationService.resubmitCredential).mockImplementation((_id, _file, _token, handlers) => {
      onProgress = handlers?.onProgress;
      return new Promise<DoctorCredential>(() => {});
    });
    const user = userEvent.setup();
    renderList([credential({ id: 'dc-3', status: 'rejected' })]);

    await user.click(screen.getByRole('button', { name: /resubmit document/i }));
    await user.upload(screen.getByLabelText(/replacement file for license.pdf/i), fileWith('new.pdf', 'application/pdf', 2048));
    await user.click(screen.getByRole('button', { name: /resubmit for review/i }));

    await waitFor(() => expect(onProgress).toBeTypeOf('function'));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    act(() => onProgress?.(1024, 2048));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('closes the resubmission form once the replacement is accepted', async () => {
    vi.mocked(verificationService.resubmitCredential).mockResolvedValue(credential({ status: 'pending' }));
    const user = userEvent.setup();
    renderList([credential({ id: 'dc-3', status: 'rejected' })]);

    await user.click(screen.getByRole('button', { name: /resubmit document/i }));
    await user.upload(screen.getByLabelText(/replacement file for license.pdf/i), fileWith('new.pdf', 'application/pdf', 1024));
    await user.click(screen.getByRole('button', { name: /resubmit for review/i }));

    await waitFor(() => expect(screen.queryByLabelText(/replacement file for/i)).toBeNull());
  });

  it('shows the empty state before anything is uploaded', () => {
    renderList([]);
    expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument();
    expect(screen.getByText(/get-on-demand/i)).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    render(<CredentialList credentials={[]} isLoading error={null} />);
    expect(screen.getByText(/loading your documents/i)).toBeInTheDocument();
  });

  it('shows the backend message when the list cannot be read', () => {
    render(
      <CredentialList
        credentials={[]}
        isLoading={false}
        error="Verification records are unavailable right now."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Verification records are unavailable right now.');
  });
});
