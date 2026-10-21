import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayWithWallet } from './PayWithWallet';
import { ApiError } from '../../../services/api-client';
import type { WalletBridge } from '../wallet';
import type { PaymentIntent } from '../../../types/models';

vi.mock('../../../services/payments-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/payments-service')>();
  return {
    ...actual,
    preparePaymentIntent: vi.fn(),
    submitPaymentIntent: vi.fn(),
    getPaymentIntent: vi.fn(),
    getPaymentIntentForOrder: vi.fn(),
  };
});

import * as paymentsService from '../../../services/payments-service';
import { useAuthStore } from '../../../store/auth-store';

const prepare = vi.mocked(paymentsService.preparePaymentIntent);
const submit = vi.mocked(paymentsService.submitPaymentIntent);
const getIntent = vi.mocked(paymentsService.getPaymentIntent);

const ORDER_ID = 'ord-1';
const intent: PaymentIntent = {
  id: 'int-1',
  orderType: 'prescription',
  orderId: ORDER_ID,
  status: 'created',
  patientProfileId: 'pp-1',
  facilityId: 'fac-1',
  amountStroops: '250000000',
  escrowId: null,
  stellarTxHash: null,
  sorobanContractId: null,
  createdAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-20T09:00:00.000Z',
};

const FUTURE_EXPIRY = '2100-01-01T00:00:00.000Z';

function fakeWallet(sign?: WalletBridge['signTransaction']): WalletBridge {
  return {
    id: 'fake',
    name: 'Fake Wallet',
    getAddress: () => Promise.resolve('GFAKE'),
    signTransaction: sign ?? (() => Promise.resolve('SIGNED_XDR')),
  };
}

function renderFlow(wallet: WalletBridge | null = fakeWallet()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PayWithWallet orderId={ORDER_ID} intent={intent} wallet={wallet} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: 'patient-token',
    user: { id: 'u-1', email: 'pat@example.test', role: 'patient', createdAt: '', updatedAt: '' },
  });
  prepare.mockResolvedValue({ intentId: intent.id, xdr: 'UNSIGNED_XDR', expiresAt: FUTURE_EXPIRY, expiryLedger: null, status: 'awaiting_signature' });
  submit.mockResolvedValue({ ...intent, status: 'escrowed', stellarTxHash: 'abc123' });
});

describe('PayWithWallet — success', () => {
  it('prepares, signs, submits and confirms without leaving the panel', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(await screen.findByText('Payment confirmed')).toBeInTheDocument();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith(intent.id, 'patient-token');
    // The wallet only ever saw the XDR docforum-core prepared; the signed XDR
    // went straight back to docforum-core.
    expect(submit).toHaveBeenCalledWith(intent.id, 'SIGNED_XDR', 'patient-token');
    expect(screen.getByRole('link', { name: /stellar explorer/i })).toHaveAttribute(
      'href',
      expect.stringContaining('abc123'),
    );
  });

  it('polls the intent to confirmed when submit returns before finality', async () => {
    const user = userEvent.setup();
    submit.mockResolvedValue({ ...intent, status: 'awaiting_signature' });
    getIntent.mockResolvedValue({ ...intent, status: 'escrowed', stellarTxHash: 'def456' });

    renderFlow();
    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(await screen.findByText('Payment confirmed', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(getIntent).toHaveBeenCalled();
  });
});

describe('PayWithWallet — the normal outcomes', () => {
  it('treats a wallet refusal as a neutral outcome, not an error', async () => {
    const user = userEvent.setup();
    renderFlow(fakeWallet(() => Promise.reject(new Error('User rejected the request'))));

    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(await screen.findByText(/You declined in your wallet/i)).toBeInTheDocument();
    // No error styling: an alert region would be the error path.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(submit).not.toHaveBeenCalled();

    // Back to the start, ready to pay.
    await user.click(screen.getByRole('button', { name: 'Back to payment' }));
    expect(screen.getByRole('button', { name: 'Pay with wallet' })).toBeInTheDocument();
  });

  it('explains an expired transaction and re-prepares in one tap, keeping the panel', async () => {
    const user = userEvent.setup();
    // First submission hits an expired preparation; the re-prepared attempt
    // goes through — expiry is one outcome, not a permanent failure.
    submit.mockRejectedValueOnce(new ApiError('prepared transaction expired', 410));
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(await screen.findByText(/This transaction expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();

    // One tap later: a fresh preparation on the same intent, same panel —
    // the patient never navigates and never re-enters anything.
    await user.click(screen.getByRole('button', { name: 'Prepare a new transaction' }));

    expect(await screen.findByText('Payment confirmed')).toBeInTheDocument();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(prepare).toHaveBeenLastCalledWith(intent.id, 'patient-token');
    expect(screen.getByRole('heading', { name: 'Pay with your wallet' })).toBeInTheDocument();
  });

  it('shows a prepare failure as an alert with the server reason', async () => {
    const user = userEvent.setup();
    prepare.mockRejectedValue(new ApiError('Backend is unavailable.', 503));
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Backend is unavailable.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('names a missing wallet link instead of failing opaquely', async () => {
    const user = userEvent.setup();
    prepare.mockRejectedValue(new ApiError('No wallet linked.', 409, { code: 'WALLET_NOT_LINKED' }));
    renderFlow();

    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(await screen.findByText(/No linked wallet yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says so when no wallet extension is detected', async () => {
    const user = userEvent.setup();
    renderFlow(null);

    await user.click(screen.getByRole('button', { name: 'Pay with wallet' }));

    expect(await screen.findByText(/No wallet detected/i)).toBeInTheDocument();
    expect(prepare).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
