import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test/render';
import { PaymentHistoryPage } from './PaymentHistoryPage';
import * as paymentHistoryService from '../services/payment-history-service';
import { ApiError } from '../services/api-client';
import { useAuthStore } from '../store/auth-store';
import type { PaymentHistoryEntry, PaymentHistoryPage as Page } from '../types/models';

vi.mock('../services/payment-history-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/payment-history-service')>();
  return {
    ...actual,
    listPaymentHistory: vi.fn(),
    fetchAllPaymentHistory: vi.fn(),
    getPaymentHistoryEntry: vi.fn(),
  };
});

function entry(overrides: Partial<PaymentHistoryEntry> = {}): PaymentHistoryEntry {
  return {
    id: 'pi-1',
    orderType: 'prescription',
    orderId: 'ord-1',
    status: 'escrowed',
    patientProfileId: 'pp-1',
    facilityId: 'fac-1',
    amountStroops: '25000000',
    escrowId: '77',
    stellarTxHash: null,
    sorobanContractId: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

function page(intents: PaymentHistoryEntry[], nextCursor: string | null): Page {
  return { intents, nextCursor };
}

describe('PaymentHistoryPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(paymentHistoryService.listPaymentHistory).mockReset();
    vi.mocked(paymentHistoryService.fetchAllPaymentHistory).mockReset();
  });

  it('shows the amount with its unit and the status in plain words', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(page([entry()], null));

    const { container } = render(<PaymentHistoryPage />);

    expect(await screen.findByText('2.5 XLM')).toBeInTheDocument();
    expect(screen.getByText('Held in escrow')).toBeInTheDocument();
    expect(screen.getByText('Prescription')).toBeInTheDocument();

    // facilityId/orderId are pointers the patient cannot act on, and the
    // facility name is only an assumed extra — never fall back to the id.
    expect(container.textContent).not.toMatch(/fac-1|ord-1|pp-1/);
    expect(screen.getByText('Prescription')).toBeInTheDocument();
  });

  it('names the facility when the response carries it', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(
      page([entry({ facilityName: 'Bello Lab' })], null),
    );

    render(<PaymentHistoryPage />);

    expect(await screen.findByText(/Bello Lab/)).toBeInTheDocument();
  });

  // The review criterion for #37: above 2^53 a JS number would round the
  // patient's own payment.
  it('prints an amount larger than 2^53 stroops exactly', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(
      page([entry({ amountStroops: '9007199254740993' })], null),
    );

    render(<PaymentHistoryPage />);

    expect(await screen.findByText('900,719,925.4740993 XLM')).toBeInTheDocument();
  });

  it('links each payment to its own page', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(page([entry()], null));

    render(<PaymentHistoryPage />);

    expect(await screen.findByRole('link', { name: /2\.5 XLM/i })).toHaveAttribute('href', '/payments/pi-1');
  });

  it('asks for the next cursor only when the patient asks for older payments', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory)
      .mockResolvedValueOnce(page([entry()], 'cursor-2'))
      .mockResolvedValueOnce(page([entry({ id: 'pi-0', amountStroops: '10000000' })], null));

    render(<PaymentHistoryPage />);

    await screen.findByText('2.5 XLM');
    expect(screen.queryByText('1 XLM')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show older payments/i }));

    await waitFor(() => expect(screen.getByText('1 XLM')).toBeInTheDocument());
    expect(paymentHistoryService.listPaymentHistory).toHaveBeenLastCalledWith(
      'cursor-2',
      'test-token',
      expect.any(AbortSignal),
    );
  });

  it('says history is unavailable rather than empty when the endpoint is missing', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockRejectedValue(new ApiError('Not Found', 404));

    render(<PaymentHistoryPage />);

    expect(await screen.findByText(/not available for this deployment yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/have not paid for anything/i)).not.toBeInTheDocument();
  });

  it('describes an account that genuinely has no payments', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(page([], null));

    render(<PaymentHistoryPage />);

    expect(await screen.findByText(/have not paid for anything/i)).toBeInTheDocument();
  });

  it('explains every status the contract has, without printing the token', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(
      page(
        [
          entry({ id: 'a', status: 'created' }),
          entry({ id: 'b', status: 'escrowed' }),
          entry({ id: 'c', status: 'released' }),
          entry({ id: 'd', status: 'refunded' }),
          entry({ id: 'e', status: 'failed' }),
        ],
        null,
      ),
    );

    render(<PaymentHistoryPage />);

    await screen.findByText(/not funded/i);
    for (const label of ['Not funded', 'Held in escrow', 'Released', 'Refunded', 'Failed']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(document.body.textContent).not.toMatch(/\bescrowed\b/);
  });

  it('reads filters from URL and drives server query', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValue(
      page([entry({ id: 'pi-filtered', amountStroops: '50000000' })], null),
    );

    render(<PaymentHistoryPage />, {
      route: '/payments?payments-f-status=escrowed&payments-f-from=2026-10-01&payments-f-to=2026-10-31',
    });

    expect(await screen.findByText('5 XLM')).toBeInTheDocument();
    expect(paymentHistoryService.listPaymentHistory).toHaveBeenCalledWith(
      {
        status: 'escrowed',
        from: '2026-10-01',
        to: '2026-10-31',
        cursor: undefined,
      },
      'test-token',
      expect.any(AbortSignal),
    );
  });

  it('updates filters and queries server with new parameters', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory)
      .mockResolvedValueOnce(page([entry({ id: 'pi-1' })], null))
      .mockResolvedValueOnce(page([entry({ id: 'pi-2', status: 'released' })], null));

    render(<PaymentHistoryPage />);
    await screen.findByText('2.5 XLM');

    const statusSelect = screen.getByLabelText(/status/i);
    await userEvent.selectOptions(statusSelect, 'released');

    await waitFor(() => {
      expect(paymentHistoryService.listPaymentHistory).toHaveBeenLastCalledWith(
        {
          status: 'released',
          cursor: undefined,
        },
        'test-token',
        expect.any(AbortSignal),
      );
    });
  });

  it('shows dedicated empty state when filters have no matches and allows clearing filters', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory)
      .mockResolvedValueOnce(page([], null))
      .mockResolvedValueOnce(page([entry()], null));

    render(<PaymentHistoryPage />, {
      route: '/payments?payments-f-status=failed',
    });

    expect(await screen.findByText(/no payments match your filters/i)).toBeInTheDocument();
    expect(screen.queryByText(/have not paid for anything through docforum yet/i)).not.toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    await userEvent.click(clearButton);

    await waitFor(() => {
      expect(paymentHistoryService.listPaymentHistory).toHaveBeenLastCalledWith(
        undefined,
        'test-token',
        expect.any(AbortSignal),
      );
    });
  });

  it('exports filtered results as CSV with progress indicator and formatted amounts', async () => {
    let exportedBlob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      exportedBlob = blob as Blob;
      return 'blob:payment-csv';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValueOnce(
      page([entry({ id: 'pi-1', amountStroops: '25000000', stellarTxHash: 'hash-1' })], null),
    );
    vi.mocked(paymentHistoryService.fetchAllPaymentHistory).mockImplementation(
      async (_filters, _token, onProgress) => {
        onProgress?.(1);
        onProgress?.(2);
        return [
          entry({ id: 'pi-1', amountStroops: '25000000', stellarTxHash: 'hash-1' }),
          entry({ id: 'pi-2', amountStroops: '9007199254740993', stellarTxHash: null, status: 'created' }),
        ];
      },
    );

    render(<PaymentHistoryPage />, {
      route: '/payments?payments-f-status=escrowed',
    });

    await screen.findByText('2.5 XLM');

    const exportBtn = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportBtn);

    await waitFor(() => {
      expect(exportedBlob).toBeDefined();
    });

    const csvText = (await exportedBlob!.text()).replace(/^\uFEFF/, '');
    const lines = csvText.trim().split('\r\n');

    expect(lines[0]).toBe('ID,Date,Type,Facility,Status,Amount,Explorer Link');
    expect(lines).toHaveLength(3);
    // Page 1 entry: 2.5 XLM with explorer link
    expect(lines[1]).toContain('pi-1,2026-10-01T10:00:00Z,Prescription,,Held in escrow,2.5 XLM,https://testnet.stellar.expert/explorer/public/transaction/hash-1');
    // Page 2 entry: Large stroop amount formatted without float precision loss
    expect(lines[2]).toContain('pi-2,2026-10-01T10:00:00Z,Prescription,,Not funded,"900,719,925.4740993 XLM",');
  });

  it('displays an error message when export fails', async () => {
    vi.mocked(paymentHistoryService.listPaymentHistory).mockResolvedValueOnce(page([entry()], null));
    vi.mocked(paymentHistoryService.fetchAllPaymentHistory).mockRejectedValueOnce(new Error('Network disconnected'));

    render(<PaymentHistoryPage />);
    await screen.findByText('2.5 XLM');

    const exportBtn = screen.getByRole('button', { name: /export/i });
    await userEvent.click(exportBtn);

    expect(await screen.findByText(/payment export failed/i)).toBeInTheDocument();
  });
});
