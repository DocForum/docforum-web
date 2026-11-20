// Issue #61: every payment status must have plain-language copy and a
// timeline, the explorer link comes from #10's shared helper, amounts
// stay bigint-safe, and admin/console-only fields are never rendered.
// Labels and copy come from features/payments/status.ts — the same
// wording the payment history screens show.
import { describe, expect, it } from 'vitest';
import { render, screen } from '../../../test/render';
import { OrderPaymentPanel } from './OrderPaymentPanel';
import type { PaymentIntent, PaymentIntentStatus } from '../../../types/models';

function makeIntent(overrides: Partial<PaymentIntent> = {}): PaymentIntent {
  return {
    id: 'pin-1',
    orderType: 'prescription',
    orderId: 'ord-rx-1',
    status: 'created',
    patientProfileId: 'prf-admin-only-should-not-leak',
    facilityId: 'fac-admin-only-should-not-leak',
    amountStroops: '1250000000',
    escrowId: 'esc-admin-only-should-not-leak',
    stellarTxHash: null,
    sorobanContractId: 'CADMINONLYSHOULDNOTLEAK',
    createdAt: '2026-10-16T10:00:00.000Z',
    updatedAt: '2026-10-17T15:06:00.000Z',
    ...overrides,
  };
}

describe('OrderPaymentPanel', () => {
  it('shows a plain-language explanation for a created (not funded) intent', () => {
    render(<OrderPaymentPanel intent={makeIntent({ status: 'created' })} />);

    expect(screen.getByText('Not funded')).toBeInTheDocument();
    expect(screen.getByText(/set up but never funded/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing has left you/i)).toBeInTheDocument();
    // Future steps are marked as not yet reached.
    expect(screen.getAllByText('Not yet').length).toBeGreaterThan(0);
  });

  it('explains escrow protection for an escrowed intent, marking it current', () => {
    render(
      <OrderPaymentPanel
        intent={makeIntent({ status: 'escrowed', stellarTxHash: 'abc123' })}
      />,
    );

    // The label appears both as the status pill and as a timeline step.
    expect(screen.getAllByText('Held in escrow')).toHaveLength(2);
    expect(screen.getByText(/protection escrow exists for/i)).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('explains a released intent as complete', () => {
    render(<OrderPaymentPanel intent={makeIntent({ status: 'released' })} />);

    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.getByText('Released to the facility')).toBeInTheDocument();
    expect(screen.getByText(/This payment is complete/i)).toBeInTheDocument();
  });

  it('explains a refunded intent as money coming back out of escrow', () => {
    render(<OrderPaymentPanel intent={makeIntent({ status: 'refunded' })} />);

    expect(screen.getByText('Refunded')).toBeInTheDocument();
    expect(screen.getByText(/came back out of escrow/i)).toBeInTheDocument();
    expect(screen.getByText('Refunded to you')).toBeInTheDocument();
  });

  it('tells the patient to contact support for a failed intent', () => {
    render(<OrderPaymentPanel intent={makeIntent({ status: 'failed' })} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/contact DocForum support/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was released to the facility/i)).toBeInTheDocument();
    expect(screen.getByText(/Nothing was moved on-chain/i)).toBeInTheDocument();
  });

  it('renders a timeline step for every status without inventing times', () => {
    const { container } = render(
      <OrderPaymentPanel intent={makeIntent({ status: 'escrowed' })} />,
    );

    const timeline = container.querySelector('ol');
    expect(timeline).not.toBeNull();
    // initiated + held + settled
    expect(timeline!.querySelectorAll('li')).toHaveLength(3);
  });

  it('formats the amount bigint-safely (large stroop values keep full precision)', () => {
    render(
      <OrderPaymentPanel intent={makeIntent({ amountStroops: '123456789012345678' })} />,
    );

    expect(screen.getByTestId('payment-amount')).toHaveTextContent(
      '12,345,678,901.2345678 XLM',
    );
  });

  it('links the transaction hash through the shared explorer helper', () => {
    render(
      <OrderPaymentPanel intent={makeIntent({ status: 'released', stellarTxHash: 'deadbeef' })} />,
    );

    const link = screen.getByRole('link', { name: /stellar explorer/i });
    expect(link).toHaveAttribute(
      'href',
      'https://testnet.stellar.expert/explorer/public/transaction/deadbeef',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows no explorer link when there is no transaction hash yet', () => {
    render(<OrderPaymentPanel intent={makeIntent({ status: 'created' })} />);

    expect(
      screen.queryByRole('link', { name: /stellar explorer/i }),
    ).not.toBeInTheDocument();
  });

  it.each<PaymentIntentStatus>(['created', 'escrowed', 'released', 'refunded', 'failed'])(
    'never renders admin/console-only fields for status %s',
    (status) => {
      render(<OrderPaymentPanel intent={makeIntent({ status })} />);

      // facilityId, patientProfileId, escrowId, sorobanContractId are
      // console-only — the patient panel must not leak them.
      expect(screen.queryByText(/fac-admin-only-should-not-leak/)).not.toBeInTheDocument();
      expect(screen.queryByText(/prf-admin-only-should-not-leak/)).not.toBeInTheDocument();
      expect(screen.queryByText(/esc-admin-only-should-not-leak/)).not.toBeInTheDocument();
      expect(screen.queryByText(/CADMINONLYSHOULDNOTLEAK/)).not.toBeInTheDocument();
      expect(screen.queryByText(/escrowId/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/soroban/i)).not.toBeInTheDocument();
    },
  );
});
