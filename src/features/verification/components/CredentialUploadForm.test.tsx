import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { CredentialUploadForm } from './CredentialUploadForm';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as verificationService from '../../../services/doctor-verification-service';
import { MAX_CREDENTIAL_BYTES } from '../requirements';
import type { CredentialType, DoctorCredential } from '../../../types/models';

vi.mock('../../../services/doctor-verification-service');

type ProgressHandler = (loadedBytes: number, totalBytes: number) => void;

const UPLOADED: DoctorCredential = {
  id: 'dc-1',
  doctorProfileId: 'dp-1',
  type: 'medical_license',
  fileName: 'license.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  status: 'pending',
  rejectionReason: null,
  submittedAt: '2026-01-05T00:00:00Z',
  updatedAt: '2026-01-05T00:00:00Z',
};

/** Only `size`/`type` matter to the rules, so no test allocates a real scan. */
function fileWith(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/** Holds the request open so the test can feed `onProgress` byte counts by
 * hand — the progress bar only moves when this fires. */
function deferUpload() {
  let resolve!: (credential: DoctorCredential) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<DoctorCredential>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const captured: { onProgress?: ProgressHandler; signal?: AbortSignal; type?: CredentialType } = {};

  vi.mocked(verificationService.uploadCredential).mockImplementation((_file, type, _accessToken, handlers) => {
    captured.type = type;
    captured.onProgress = handlers?.onProgress;
    captured.signal = handlers?.signal;
    return pending;
  });

  return { resolve, reject, captured };
}

async function pickDocument(user: ReturnType<typeof userEvent.setup>, file: File, type: string) {
  await user.upload(screen.getByLabelText(/document file/i), file);
  await user.selectOptions(screen.getByLabelText(/document type/i), type);
  await user.click(screen.getByRole('button', { name: /upload document/i }));
}

describe('CredentialUploadForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(verificationService.uploadCredential).mockReset();
  });

  it('labels the file input and offers every document type', () => {
    render(<CredentialUploadForm />);

    const input = screen.getByLabelText(/document file/i);
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'application/pdf,image/jpeg,image/png');
    expect(screen.getByLabelText(/document type/i)).toHaveDisplayValue('Choose a document type');
    expect(screen.getByRole('option', { name: /medical license \(required\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /other supporting document \(optional\)/i })).toBeInTheDocument();
  });

  it('says the requirement list is review policy, not a server rule', () => {
    render(<CredentialUploadForm />);
    expect(screen.getByText(/current review policy/i)).toBeInTheDocument();
  });

  it('rejects an oversize file without calling the service', async () => {
    const user = userEvent.setup();
    render(<CredentialUploadForm />);

    await pickDocument(user, fileWith('huge-scan.pdf', 'application/pdf', MAX_CREDENTIAL_BYTES + 1), 'medical_license');

    expect(await screen.findByText(/or smaller/i)).toBeInTheDocument();
    expect(verificationService.uploadCredential).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  // A real OS dialog lets people ignore the `accept` hint, so the JS rule is
  // the gate: `applyAccept: false` stands in for that bypass.
  it('rejects a disallowed file type without calling the service', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<CredentialUploadForm />);

    await pickDocument(user, fileWith('license.docx', 'application/msword', 2048), 'medical_license');

    expect(await screen.findByText(/reviewers can only open/i)).toBeInTheDocument();
    expect(verificationService.uploadCredential).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('refuses to submit without a document type', async () => {
    const user = userEvent.setup();
    render(<CredentialUploadForm />);

    await user.upload(screen.getByLabelText(/document file/i), fileWith('license.pdf', 'application/pdf', 2048));
    await user.click(screen.getByRole('button', { name: /upload document/i }));

    expect(await screen.findByText(/choose which document type/i)).toBeInTheDocument();
    expect(verificationService.uploadCredential).not.toHaveBeenCalled();
  });

  it('uploads a valid credential and reports real byte progress', async () => {
    const { resolve, captured } = deferUpload();
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    render(<CredentialUploadForm onUploaded={onUploaded} />);

    await pickDocument(user, fileWith('license.pdf', 'application/pdf', 2048), 'medical_license');

    await waitFor(() => expect(captured.onProgress).toBeTypeOf('function'));
    expect(verificationService.uploadCredential).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'license.pdf' }),
      'medical_license',
      'test-token',
      expect.objectContaining({ signal: captured.signal }),
    );

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');

    act(() => captured.onProgress?.(1024, 2048));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/1 KB of 2 KB/i)).toBeInTheDocument();

    act(() => captured.onProgress?.(2048, 2048));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    act(() => resolve(UPLOADED));
    expect(await screen.findByText(/uploaded — now pending review/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/no document chosen/i)).toBeInTheDocument();
  });

  it('disables the controls while the upload is in flight and cancels on request', async () => {
    const { captured } = deferUpload();
    const user = userEvent.setup();
    render(<CredentialUploadForm />);

    await pickDocument(user, fileWith('license.pdf', 'application/pdf', 2048), 'medical_license');
    await waitFor(() => expect(captured.onProgress).toBeTypeOf('function'));

    expect(screen.getByRole('button', { name: /upload document/i })).toBeDisabled();
    expect(screen.getByLabelText(/document file/i)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(captured.signal?.aborted).toBe(true);
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button', { name: /upload document/i })).toBeEnabled();
  });

  it('shows the server reason when the upload is refused', async () => {
    const { reject, captured } = deferUpload();
    const user = userEvent.setup();
    render(<CredentialUploadForm />);

    await pickDocument(user, fileWith('license.pdf', 'application/pdf', 2048), 'medical_license');
    await waitFor(() => expect(captured.onProgress).toBeTypeOf('function'));

    act(() => reject(new ApiError('That license is already on file.', 409)));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('That license is already on file.');
  });

  it('does not report a cancellation the doctor asked for as a failure', async () => {
    const { reject, captured } = deferUpload();
    const user = userEvent.setup();
    render(<CredentialUploadForm />);

    await pickDocument(user, fileWith('license.pdf', 'application/pdf', 2048), 'medical_license');
    await waitFor(() => expect(captured.onProgress).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    act(() => reject(new ApiError('Upload cancelled.', 0)));

    await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
    expect(screen.queryByText(/upload cancelled/i)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
