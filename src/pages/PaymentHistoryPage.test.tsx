import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test/render';
import { PaymentHistoryPage } from './PaymentHistoryPage';
import * as paymentHistoryService from '../services/payment-history-service';
import { ApiError } from '../services/api-client';
import { useAuthStore } from '../store/auth-store';
import type { PaymentHistoryEntry, PaymentHistoryPage as Page } from '../types/models';

vi.mock('../services/payment-history-service');

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
    expect(paymentHistoryService.listPaymentHistory).toHaveBeenLastCalledWith('cursor-2', 'test-token');
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
});
