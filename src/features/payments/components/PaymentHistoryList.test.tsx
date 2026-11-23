import { describe, expect, it } from 'vitest';
import { axe } from 'jest-axe';
import { render, screen } from '../../../test/render';
import { PaymentHistoryList } from './PaymentHistoryList';
import { makePaymentIntent } from '../../../test/factories';
import type { PaymentHistoryEntry } from '../../../types/models';

function entry(overrides: Partial<PaymentHistoryEntry> = {}): PaymentHistoryEntry {
  return { ...makePaymentIntent(), ...overrides } as PaymentHistoryEntry;
}

describe('PaymentHistoryList', () => {
  it('shows the empty explanation instead of a list when nothing was paid', () => {
    render(<PaymentHistoryList entries={[]} />);

    expect(screen.getByText(/You have not paid for anything through DocForum yet/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('links each payment to its receipt with amount, type and status', () => {
    render(
      <PaymentHistoryList
        entries={[
          entry({ id: 'pin-1', status: 'escrowed', amountStroops: '500000000', facilityName: 'Demo Pharmacy (fake)' }),
          entry({
            id: 'pin-2',
            orderType: 'lab_order',
            status: 'refunded',
            amountStroops: '25000000',
          }),
        ]}
      />,
    );

    const first = screen.getByRole('link', { name: /50 XLM/ });
    expect(first).toHaveAttribute('href', '/payments/pin-1');
    expect(first).toHaveTextContent('Prescription');
    expect(first).toHaveTextContent('Demo Pharmacy (fake)');
    expect(first).toHaveTextContent('Held in escrow');

    const second = screen.getByRole('link', { name: /2.5 XLM/ });
    expect(second).toHaveAttribute('href', '/payments/pin-2');
    expect(second).toHaveTextContent('Lab order');
    expect(second).toHaveTextContent('Refunded');
  });

  it('never renders the internal facility id when the name is absent', () => {
    render(<PaymentHistoryList entries={[entry({ facilityId: 'fac-internal-1' })]} />);

    expect(screen.getByRole('link')).not.toHaveTextContent('fac-internal-1');
  });

  it('has no axe violations', async () => {
    const { container } = render(<PaymentHistoryList entries={[entry({ facilityName: 'Demo Lab (fake)' })]} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
