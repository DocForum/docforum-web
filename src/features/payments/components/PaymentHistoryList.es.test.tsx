import { describe, expect, it } from 'vitest';
import { renderWithProviders, screen } from '../../../test/render';
import { makePaymentIntent } from '../../../test/factories';
import { PaymentHistoryList } from './PaymentHistoryList';
import type { PaymentHistoryEntry } from '../../../types/models';

const ENTRY: PaymentHistoryEntry = {
  ...makePaymentIntent({ status: 'escrowed', orderType: 'prescription' }),
  facilityName: 'Demo Pharmacy (fake)',
};

describe('PaymentHistoryList in Spanish (#250)', () => {
  it('renders the status, order type and date labels in Spanish', () => {
    renderWithProviders(<PaymentHistoryList entries={[ENTRY]} />, {
      locale: 'es',
      route: '/payments',
    });

    expect(screen.getByText('En depósito en garantía')).toBeInTheDocument();
    expect(screen.getByText(/Receta/)).toBeInTheDocument();
    expect(screen.getByText(/Demo Pharmacy \(fake\)/)).toBeInTheDocument();
  });

  it('translates every payment status', () => {
    const statuses: { status: PaymentHistoryEntry['status']; label: string }[] = [
      { status: 'created', label: 'Sin financiar' },
      { status: 'awaiting_signature', label: 'Esperando tu firma' },
      { status: 'escrowed', label: 'En depósito en garantía' },
      { status: 'released', label: 'Liberado' },
      { status: 'refunded', label: 'Reembolsado' },
      { status: 'failed', label: 'Fallido' },
    ];

    for (const { status, label } of statuses) {
      const { unmount } = renderWithProviders(
        <PaymentHistoryList entries={[{ ...ENTRY, status }]} />,
        { locale: 'es', route: '/payments' },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      // The raw API status must never be rendered.
      expect(screen.queryByText(status)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('shows the Spanish empty state', () => {
    renderWithProviders(<PaymentHistoryList entries={[]} />, {
      locale: 'es',
      route: '/payments',
    });

    expect(screen.getByText(/Aún no has pagado nada a través de DocForum/)).toBeInTheDocument();
    expect(screen.queryByText(/You have not paid for anything/)).not.toBeInTheDocument();
  });
});
