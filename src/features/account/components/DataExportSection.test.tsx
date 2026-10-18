import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { DataExportSection } from './DataExportSection';
import * as accountService from '../../../services/account-service';
import { useAuthStore } from '../../../store/auth-store';
import type { DataExport } from '../../../types/models';

vi.mock('../../../services/account-service');

describe('DataExportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', email: 'patient@docforum.test', role: 'patient', createdAt: '', updatedAt: '' },
      accessToken: 'test-token',
    });
  });

  it('renders initial state with explanation and request button', async () => {
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(null);

    render(<DataExportSection />);

    expect(await screen.findByRole('heading', { name: /download my data/i })).toBeInTheDocument();
    expect(screen.getByText(/what is included in your export bundle/i)).toBeInTheDocument();
    expect(screen.getByText(/24 hours/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /request personal data export/i })).toBeInTheDocument();
  });

  it('opens password re-authentication modal and triggers request on submit', async () => {
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(null);
    const mockExport: DataExport = {
      id: 'exp-1',
      patientProfileId: 'p1',
      status: 'processing',
      requestedAt: new Date().toISOString(),
    };
    vi.mocked(accountService.requestDataExport).mockResolvedValue(mockExport);

    const user = userEvent.setup();
    render(<DataExportSection />);

    const requestBtn = await screen.findByRole('button', { name: /request personal data export/i });
    await user.click(requestBtn);

    expect(screen.getByRole('heading', { name: /confirm your password/i })).toBeInTheDocument();

    const passwordInput = screen.getByLabelText(/account password/i);
    await user.type(passwordInput, 'secret123');

    const confirmBtn = screen.getByRole('button', { name: /confirm & request/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(accountService.requestDataExport).toHaveBeenCalledWith('secret123', 'test-token');
    });
  });

  it('renders processing state with spinner', async () => {
    const mockExport: DataExport = {
      id: 'exp-2',
      patientProfileId: 'p1',
      status: 'processing',
      requestedAt: new Date().toISOString(),
    };
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(mockExport);

    render(<DataExportSection />);

    expect(await screen.findByText(/processing export/i)).toBeInTheDocument();
    expect(screen.getByText(/your export bundle is being generated/i)).toBeInTheDocument();
  });

  it('renders ready state and initiates download', async () => {
    const mockExport: DataExport = {
      id: 'exp-3',
      patientProfileId: 'p1',
      status: 'ready',
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      fileSizeBytes: 1048576,
    };
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(mockExport);
    const dummyBlob = new Blob(['{"test": true}'], { type: 'application/json' });
    vi.mocked(accountService.downloadDataExport).mockResolvedValue(dummyBlob);

    // Mock URL.createObjectURL and revokeObjectURL
    const createObjectURL = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    const user = userEvent.setup();
    render(<DataExportSection />);

    expect(await screen.findByText(/ready for download/i)).toBeInTheDocument();
    expect(screen.getByText(/1.0 MB/i)).toBeInTheDocument();

    const downloadBtn = screen.getByRole('button', { name: /download export file/i });
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(accountService.downloadDataExport).toHaveBeenCalledWith('exp-3', 'test-token');
      expect(createObjectURL).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
    });
  });

  it('renders expired state and allows requesting again', async () => {
    const mockExport: DataExport = {
      id: 'exp-4',
      patientProfileId: 'p1',
      status: 'expired',
      requestedAt: new Date(Date.now() - 172800000).toISOString(),
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
    };
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(mockExport);

    render(<DataExportSection />);

    expect(await screen.findByText(/export expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request new export/i })).toBeInTheDocument();
  });

  it('renders failed state with error message', async () => {
    const mockExport: DataExport = {
      id: 'exp-5',
      patientProfileId: 'p1',
      status: 'failed',
      requestedAt: new Date().toISOString(),
      errorMessage: 'Database export timeout',
    };
    vi.mocked(accountService.getDataExportStatus).mockResolvedValue(mockExport);

    render(<DataExportSection />);

    expect(await screen.findByText(/export failed/i)).toBeInTheDocument();
    expect(screen.getByText(/generation failed: database export timeout/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
