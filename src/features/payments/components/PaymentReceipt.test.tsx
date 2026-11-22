import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../../../test/render';
import { PaymentReceipt } from './PaymentReceipt';
import { makePaymentIntent } from '../../../test/factories';
import type { PaymentHistoryEntry } from '../../../types/models';

const NOW = new Date('2026-10-20T12:00:00.000Z');

function entry(overrides: Partial<PaymentHistoryEntry> = {}): PaymentHistoryEntry {
  return {
    ...makePaymentIntent({
      id: 'pin-receipt-1',
      status: 'released',
      amountStroops: '500000000',
      stellarTxHash: 'tx-demo-hash',
      sorobanContractId: 'CD-DEMO-CONTRACT',
    }),
    facilityName: 'Demo Pharmacy (fake)',
    refundDeadlineAt: '2026-10-25T12:00:00.000Z',
    ...overrides,
  } as PaymentHistoryEntry;
}

describe('PaymentReceipt', () => {
  it('shows the verifiable payment facts and explorer links', () => {
    render(<PaymentReceipt entry={entry()} now={NOW} />);

    expect(screen.getByRole('heading', { name: 'Payment receipt' })).toBeInTheDocument();
    expect(screen.getByText('Demo Pharmacy (fake)')).toBeInTheDocument();
    expect(screen.getByText('50 XLM')).toBeInTheDocument();
    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.getByText('tx-demo-hash')).toBeInTheDocument();
    expect(screen.getByText('CD-DEMO-CONTRACT')).toBeInTheDocument();
    expect(screen.getByText(/can still be refunded until/)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'transaction' })).toHaveAttribute(
      'href',
      'https://testnet.stellar.expert/explorer/public/transaction/tx-demo-hash',
    );
    expect(screen.getByRole('link', { name: 'escrow contract' })).toHaveAttribute(
      'href',
      'https://testnet.stellar.expert/explorer/public/contract/CD-DEMO-CONTRACT',
    );
  });

  it('says there is nothing to verify before the payment is funded', () => {
    render(
      <PaymentReceipt
        entry={entry({ status: 'created', stellarTxHash: null, sorobanContractId: null, refundDeadlineAt: null })}
        now={NOW}
      />,
    );

    expect(screen.getByText(/No on-chain transaction yet/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/set up but never funded/)).toBeInTheDocument();
  });

  it('describes an expired refund window in the past tense', () => {
    render(<PaymentReceipt entry={entry({ refundDeadlineAt: '2026-10-01T12:00:00.000Z' })} now={NOW} />);

    expect(screen.getByText(/The refund window closed on/)).toBeInTheDocument();
  });

  it('omits the facility row when no name is known', () => {
    render(<PaymentReceipt entry={entry({ facilityName: undefined })} now={NOW} />);

    expect(screen.queryByText('Facility')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<PaymentReceipt entry={entry()} now={NOW} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
