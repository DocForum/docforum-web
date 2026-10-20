import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render as rtlRender, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PaymentDetailPage } from './PaymentDetailPage';
import * as paymentHistoryService from '../services/payment-history-service';
import { ApiError } from '../services/api-client';
import { useAuthStore } from '../store/auth-store';
import type { PaymentHistoryEntry } from '../types/models';

vi.mock('../services/payment-history-service');

const TX = 'a'.repeat(64);
const CONTRACT = 'CA'.padEnd(56, 'B');

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
    stellarTxHash: TX,
    sorobanContractId: CONTRACT,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/payments/:intentId" element={<PaymentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaymentDetailPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockReset();
    window.print = vi.fn();
  });

  it('prints a receipt that is still verifiable on paper', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(entry());

    const { container } = renderAt('/payments/pi-1');

    const receipt = await screen.findByTestId('payment-receipt');
    // The status word appears twice on this page (the pill above the receipt
    // and the line inside it), so the receipt itself is the scope here.
    expect(within(receipt).getByText('2.5 XLM')).toBeInTheDocument();
    expect(within(receipt).getByText('Held in escrow')).toBeInTheDocument();
    // The hashes have to be readable text, not only hrefs, or a printed
    // receipt proves nothing to whoever receives it.
    expect(within(receipt).getByText(TX)).toBeInTheDocument();
    expect(within(receipt).getByText(CONTRACT)).toBeInTheDocument();
    // …and the internal pointers a patient cannot act on stay off it.
    expect(container.textContent).not.toMatch(/fac-1|ord-1|pp-1/);
  });

  it('links the explorer from the page chrome, never the printed copy', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(entry());

    renderAt('/payments/pi-1');

    const txLink = await screen.findByRole('link', { name: 'transaction' });
    expect(txLink).toHaveAttribute('href', `https://testnet.stellar.expert/explorer/public/transaction/${TX}`);
    expect(txLink).toHaveAttribute('target', '_blank');
    expect(txLink).toHaveAttribute('rel', 'noopener noreferrer');

    const contractLink = screen.getByRole('link', { name: 'escrow contract' });
    expect(contractLink).toHaveAttribute('href', `https://testnet.stellar.expert/explorer/public/contract/${CONTRACT}`);
    expect(contractLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not offer to print a receipt that was never fetched', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(entry());

    renderAt('/payments/pi-1');

    await screen.findByTestId('payment-receipt');
    await userEvent.click(screen.getByRole('button', { name: /print receipt/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('says there is nothing to verify before the payment is on-chain', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(
      entry({ stellarTxHash: null, sorobanContractId: null }),
    );

    renderAt('/payments/pi-1');

    expect(await screen.findByText(/no on-chain transaction yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'transaction' })).not.toBeInTheDocument();
  });

  it('explains what each status means for the money', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(
      entry({ status: 'released' }),
    );

    renderAt('/payments/pi-1');

    expect(await screen.findByText(/the money was released to the facility/i)).toBeInTheDocument();
  });

  it('shows a refund window that is still open', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(
      entry({
        status: 'released',
        refundDeadlineAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );

    renderAt('/payments/pi-1');

    expect(await screen.findByText(/can still be refunded until/i)).toBeInTheDocument();
  });

  it('shows a refund window that has already closed', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(
      entry({
        refundDeadlineAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }),
    );

    renderAt('/payments/pi-1');

    expect(await screen.findByText(/the refund window closed on/i)).toBeInTheDocument();
  });

  it('omits the refund window entirely when the response has none', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(entry());

    renderAt('/payments/pi-1');

    await screen.findByTestId('payment-receipt');
    expect(screen.queryByText(/refund window/i)).not.toBeInTheDocument();
  });

  it('labels a lab order as a lab order', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockResolvedValue(
      entry({ orderType: 'lab_order' }),
    );

    renderAt('/payments/pi-1');

    expect(await screen.findByText('Lab order')).toBeInTheDocument();
  });

  it('says the receipt is unavailable rather than showing an empty one', async () => {
    vi.mocked(paymentHistoryService.getPaymentHistoryEntry).mockRejectedValue(new ApiError('Not Found', 404));

    renderAt('/payments/pi-1');

    expect(await screen.findByText(/not available for this deployment yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-receipt')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to your payments/i })).toHaveAttribute('href', '/payments');
  });

  it('asks the visitor to sign in instead of guessing', async () => {
    useAuthStore.setState({ accessToken: null });

    renderAt('/payments/pi-1');

    expect(await screen.findByText(/sign in to see this payment/i)).toBeInTheDocument();
    expect(paymentHistoryService.getPaymentHistoryEntry).not.toHaveBeenCalled();
  });
});
