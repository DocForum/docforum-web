import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';
import * as fulfillmentService from '../../../services/fulfillment-service';
import type { FulfillmentQueueItem } from '../../../types/models';
import { FacilityQueuePanel } from './FacilityQueuePanel';

vi.mock('../../../services/fulfillment-service');

const ITEMS: FulfillmentQueueItem[] = [
  {
    id: 'fuq-1',
    facilityId: 'fac-1',
    orderId: 'ord-rx-1',
    orderType: 'prescription',
    patientName: 'Pat Placeholder (fake)',
    patientProfileId: 'prf-1',
    itemName: 'Demo Amoxicillin 500mg (fake)',
    instructions: 'Demo instructions (fake).',
    status: 'pending',
    receivedAt: '2026-10-20T08:00:00Z',
    attribution: null,
  },
  {
    id: 'fuq-2',
    facilityId: 'fac-1',
    orderId: 'ord-lab-1',
    orderType: 'lab',
    patientName: 'Sam Example (fake)',
    patientProfileId: 'prf-2',
    itemName: 'Demo blood panel (fake)',
    instructions: 'Demo fasting instructions (fake).',
    status: 'pending',
    receivedAt: '2026-10-20T08:30:00Z',
    attribution: null,
  },
  {
    id: 'fuq-3',
    facilityId: 'fac-1',
    orderId: 'ord-rx-2',
    orderType: 'prescription',
    patientName: 'Quinn Example (fake)',
    patientProfileId: 'prf-3',
    itemName: 'Demo Metformin 850mg (fake)',
    status: 'fulfilled',
    receivedAt: '2026-10-19T14:00:00Z',
    attribution: {
      action: 'dispensed',
      performedByUserId: 'usr-staff-1',
      performedByName: 'Mo Example (fake)',
      performedByEmail: 'mo.example@example.test',
      performedByRole: 'staff',
      timestamp: '2026-10-19T14:40:00Z',
      notes: 'Demo attribution (fake).',
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(fulfillmentService.listFulfillmentQueue).mockResolvedValue(ITEMS);
  vi.mocked(fulfillmentService.updateFulfillmentStatus).mockImplementation(
    async (_facilityId, itemId, status) => ({
      ...ITEMS.find((item) => item.id === itemId)!,
      status,
    }),
  );
  vi.mocked(fulfillmentService.uploadFulfillmentLabResult).mockImplementation(
    async (_facilityId, itemId, file) => ({
      ...ITEMS.find((item) => item.id === itemId)!,
      labResult: {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedAt: '2026-10-20T09:00:00Z',
        uploadedByUserId: 'usr-staff-1',
        downloadUrl: null,
      },
    }),
  );
});

describe('FacilityQueuePanel', () => {
  it('renders queue items, status and attribution', async () => {
    render(<FacilityQueuePanel facilityId="fac-1" />);

    expect(await screen.findByText('Demo Amoxicillin 500mg (fake)')).toBeInTheDocument();
    expect(screen.getByText('Demo blood panel (fake)')).toBeInTheDocument();
    expect(screen.getByText('Demo Metformin 850mg (fake)')).toBeInTheDocument();
    expect(screen.getByText(/dispensed by/i)).toBeInTheDocument();
    expect(screen.getByText('Fulfilled')).toBeInTheDocument();
    expect(screen.getByText(/all \(3\)/i)).toBeInTheDocument();
  });

  it('filters to items that still need action', async () => {
    const user = userEvent.setup();
    render(<FacilityQueuePanel facilityId="fac-1" />);

    await screen.findByText('Demo Amoxicillin 500mg (fake)');
    await user.selectOptions(screen.getByLabelText('Show'), 'active');

    expect(screen.getByText('Demo Amoxicillin 500mg (fake)')).toBeInTheDocument();
    expect(screen.queryByText('Demo Metformin 850mg (fake)')).not.toBeInTheDocument();
  });

  it('moves a pending item to in progress', async () => {
    const user = userEvent.setup();
    render(<FacilityQueuePanel facilityId="fac-1" />);

    const startButtons = await screen.findAllByRole('button', { name: /start processing/i });
    await user.click(startButtons[0]);

    await waitFor(() => {
      expect(fulfillmentService.updateFulfillmentStatus).toHaveBeenCalledWith(
        'fac-1',
        'fuq-1',
        'in_progress',
        'test-token',
        undefined,
      );
    });
  });

  it('fulfills an in-progress item and rejects another', async () => {
    const inProgress = ITEMS.map((item) =>
      item.id === 'fuq-1' ? { ...item, status: 'in_progress' as const } : item,
    );
    vi.mocked(fulfillmentService.listFulfillmentQueue).mockResolvedValue(inProgress);
    const user = userEvent.setup();
    render(<FacilityQueuePanel facilityId="fac-1" />);

    expect(await screen.findByRole('button', { name: /dispense & fulfill/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start processing/i })).toHaveLength(1);

    const rejectButtons = screen.getAllByRole('button', { name: /^reject$/i });
    await user.click(rejectButtons[0]);
    await waitFor(() => {
      expect(fulfillmentService.updateFulfillmentStatus).toHaveBeenCalledWith(
        'fac-1',
        'fuq-1',
        'rejected',
        'test-token',
        undefined,
      );
    });
  });

  it('uploads a lab result file for a lab order', async () => {
    const user = userEvent.setup();
    render(<FacilityQueuePanel facilityId="fac-1" />);

    const file = new File(['demo lab result'], 'demo-result.pdf', { type: 'application/pdf' });
    const uploadInput = (await screen.findAllByLabelText(/attach lab result file/i))[0];
    await user.upload(uploadInput, file);
    await user.click(screen.getByRole('button', { name: /upload lab result/i }));

    await waitFor(() => {
      expect(fulfillmentService.uploadFulfillmentLabResult).toHaveBeenCalledWith(
        'fac-1',
        'fuq-2',
        file,
        'test-token',
      );
    });
  });

  it('rejects unsupported files before uploading', async () => {
    render(<FacilityQueuePanel facilityId="fac-1" />);

    const uploadInput = (await screen.findAllByLabelText(/attach lab result file/i))[0];
    fireEvent.change(uploadInput, {
      target: {
        files: [new File(['demo'], 'demo-result.txt', { type: 'text/plain' })],
      },
    });

    expect(await screen.findByText(/upload a pdf, jpeg, or png/i)).toBeInTheDocument();
    expect(fulfillmentService.uploadFulfillmentLabResult).not.toHaveBeenCalled();
  });

  it('shows no action buttons for closed items', async () => {
    render(<FacilityQueuePanel facilityId="fac-1" />);

    await screen.findByText('Demo Metformin 850mg (fake)');
    expect(screen.getAllByRole('button', { name: /start processing/i })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /dispense & fulfill/i })).toHaveLength(1);
  });
});
