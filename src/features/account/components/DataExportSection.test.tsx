import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { DataExportSection } from './DataExportSection';
import * as accountService from '../../../services/account-service';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import type { DataExport } from '../../../types/models';

vi.mock('../../../services/account-service');

function makeExport(overrides: Partial<DataExport> = {}): DataExport {
  return {
    id: 'exp-1',
    status: 'processing',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    generatedAt: null,
    expiresAt: null,
    sizeBytes: null,
    failure: null,
    downloadUrl: null,
    ...overrides,
  };
}

describe('DataExportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', email: 'patient@docforum.test', role: 'patient', emailVerifiedAt: null, createdAt: '', updatedAt: '' },
      accessToken: 'test-token',
    });
  });

  it('renders the initial state, explanation and honest reload note', async () => {
    render(<DataExportSection />);

    expect(await screen.findByRole('heading', { name: /download my data/i })).toBeInTheDocument();
    expect(screen.getByText(/what is included in your export bundle/i)).toBeInTheDocument();
    expect(screen.getByText(/24 hours/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request personal data export/i })).toBeInTheDocument();
    expect(
      screen.getByText(/doesn't list earlier exports.*reconnect to the existing export/i),
    ).toBeInTheDocument();
    // No list endpoint, so no status request is made until an id exists.
    expect(accountService.getDataExportStatus).not.toHaveBeenCalled();
  });

  it('requests an export with no password and tracks the id from the 202', async () => {
    const processing = makeExport();
    vi.mocked(accountService.requestDataExport).mockResolvedValue(processing);
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(processing);

    const user = userEvent.setup();
    render(<DataExportSection />);

    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));

    expect(screen.getByRole('heading', { name: /request a data export/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/account password/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^request export$/i }));

    await waitFor(() => {
      expect(accountService.requestDataExport).toHaveBeenCalledWith('test-token');
    });
    expect(await screen.findByText(/processing export/i)).toBeInTheDocument();
    expect(accountService.getDataExportStatus).toHaveBeenCalledWith('exp-1', 'test-token', expect.anything());
  });

  it('renders processing state with spinner', async () => {
    vi.mocked(accountService.requestDataExport).mockResolvedValue(makeExport());
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(makeExport({ id: 'exp-2' }));

    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));
    await user.click(screen.getByRole('button', { name: /^request export$/i }));

    expect(await screen.findByText(/processing export/i)).toBeInTheDocument();
    expect(screen.getByText(/your export bundle is being generated/i)).toBeInTheDocument();
  });

  it('renders ready state and downloads by export id', async () => {
    const ready = makeExport({
      id: 'exp-3',
      status: 'ready',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      sizeBytes: 1048576,
      downloadUrl: '/patients/me/export/exp-3/download',
    });
    vi.mocked(accountService.requestDataExport).mockResolvedValue(ready);
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(ready);
    const dummyBlob = new Blob(['{"test": true}'], { type: 'application/json' });
    vi.mocked(accountService.downloadDataExport).mockResolvedValue(dummyBlob);

    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));
    await user.click(screen.getByRole('button', { name: /^request export$/i }));

    expect(await screen.findByText(/ready for download/i)).toBeInTheDocument();
    expect(screen.getByText(/1.0 MB/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /download export file/i }));

    await waitFor(() => {
      expect(accountService.downloadDataExport).toHaveBeenCalledWith('exp-3', 'test-token');
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });

  it('maps 409 EXPORT_NOT_READY to a clear state with a new-export action', async () => {
    const ready = makeExport({ id: 'exp-4', status: 'ready', expiresAt: new Date(Date.now() + 86400000).toISOString() });
    vi.mocked(accountService.requestDataExport).mockResolvedValue(ready);
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(ready);
    vi.mocked(accountService.downloadDataExport).mockRejectedValue(
      new ApiError('Export is not ready yet.', 409, undefined, { code: 'EXPORT_NOT_READY' }),
    );

    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));
    await user.click(screen.getByRole('button', { name: /^request export$/i }));
    await user.click(await screen.findByRole('button', { name: /download export file/i }));

    expect(await screen.findByText(/isn't ready yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request a new export/i })).toBeInTheDocument();
  });

  it('maps 410 EXPORT_EXPIRED to the expired state with a new-export action', async () => {
    const ready = makeExport({ id: 'exp-5', status: 'ready', expiresAt: new Date(Date.now() + 86400000).toISOString() });
    vi.mocked(accountService.requestDataExport).mockResolvedValue(ready);
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(ready);
    vi.mocked(accountService.downloadDataExport).mockRejectedValue(
      new ApiError('Export expired.', 410, undefined, { code: 'EXPORT_EXPIRED' }),
    );

    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));
    await user.click(screen.getByRole('button', { name: /^request export$/i }));
    await user.click(await screen.findByRole('button', { name: /download export file/i }));

    expect(await screen.findByText(/export expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request a new export/i })).toBeInTheDocument();
  });

  it('renders a 404 status as a clear not-found state', async () => {
    // An id recovered from the query cache after a remount can be stale.
    const ready = makeExport({ id: 'exp-gone', status: 'ready' });
    vi.mocked(accountService.requestDataExport).mockResolvedValue(ready);
    vi.mocked(accountService.getDataExportStatus).mockRejectedValue(
      new ApiError('Not found', 404),
    );

    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));
    await user.click(screen.getByRole('button', { name: /^request export$/i }));

    expect(await screen.findByText(/couldn't find that export/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request a new export/i })).toBeInTheDocument();
  });

  it('renders failed state with the section that failed', async () => {
    const failed = makeExport({
      id: 'exp-6',
      status: 'failed',
      failure: { code: 'SECTION_FAILED', section: 'payments' },
    });
    vi.mocked(accountService.requestDataExport).mockResolvedValue(failed);
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(failed);

    const user = userEvent.setup();
    render(<DataExportSection />);
    await user.click(await screen.findByRole('button', { name: /request personal data export/i }));
    await user.click(screen.getByRole('button', { name: /^request export$/i }));

    expect(await screen.findByText(/export failed/i)).toBeInTheDocument();
    expect(screen.getByText(/part of your export \(payments\) could not be generated/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
