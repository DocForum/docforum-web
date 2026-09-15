import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import { PaymentIntentPanel } from './PaymentIntentPanel';
import { useAuthStore } from '../../../store/auth-store';
import * as paymentsService from '../../../services/payments-service';
import type { PaymentIntent } from '../../../types/models';

vi.mock('../../../services/payments-service');

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: 'intent-1',
    orderType: 'lab_order',
    orderId: 'order-1',
    status: 'created',
    patientProfileId: 'patient-1',
    facilityId: 'facility-1',
    amountStroops: '500000',
    escrowId: null,
    stellarTxHash: null,
    sorobanContractId: null,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('PaymentIntentPanel', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(paymentsService.getPaymentIntent).mockReset();
  });

  it('offers "Fund escrow" for a created intent', async () => {
    vi.mocked(paymentsService.getPaymentIntent).mockResolvedValue(makeIntent({ status: 'created' }));

    render(<PaymentIntentPanel intentId="intent-1" />);

    expect(await screen.findByRole('button', { name: /fund escrow/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /release/i })).not.toBeInTheDocument();
  });

  it('offers "Release" and "Refund" for an escrowed intent, not "Fund" again', async () => {
    vi.mocked(paymentsService.getPaymentIntent).mockResolvedValue(
      makeIntent({ status: 'escrowed', escrowId: '0', stellarTxHash: 'abc123' }),
    );

    render(<PaymentIntentPanel intentId="intent-1" />);

    expect(await screen.findByRole('button', { name: /release to facility/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refund to platform/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fund escrow/i })).not.toBeInTheDocument();
  });

  it('offers no actions for a released intent — it is terminal', async () => {
    vi.mocked(paymentsService.getPaymentIntent).mockResolvedValue(makeIntent({ status: 'released' }));

    render(<PaymentIntentPanel intentId="intent-1" />);

    await waitFor(() => expect(screen.getByText('released')).toBeInTheDocument());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
