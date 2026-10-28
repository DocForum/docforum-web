import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
import userEvent from '@testing-library/user-event';
import { OrderDetail } from './OrderDetail';
import { useAuthStore } from '../../../store/auth-store';
import * as ordersService from '../../../services/orders-service';
import type { Order } from '../../../types/models';

vi.mock('../../../services/orders-service');

// qrcode uses canvas APIs not available in happy-dom — stub out toCanvas
// so it resolves without rendering actual pixels.
vi.mock('qrcode', () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord-abc12345',
    type: 'lab_order',
    status: 'active',
    token: 'tok_signed_opaque_value',
    items: [
      { name: 'Full Blood Count', note: 'Fasting required' },
      { name: 'Lipid Panel' },
    ],
    issuedAt: '2026-10-15T10:00:00.000Z',
    expiresAt: '2026-10-22T10:00:00.000Z',
    doctorName: 'Dr. Adaeze Okonkwo',
    facilityName: 'CarePoint Lab',
    patientProfileId: 'patient-1',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('OrderDetail', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(ordersService.getOrder).mockReset();
  });

  it('shows a loading skeleton while fetching', () => {
    vi.mocked(ordersService.getOrder).mockReturnValue(new Promise(() => {}));
    render(<OrderDetail orderId="ord-abc12345" />);
    // Issue #106: query-driven views use the shared Skeleton, whose label is
    // announced through role="status".
    expect(screen.getByRole('status')).toHaveTextContent('Loading order');
  });

  it('renders QR code canvas for an active order', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(await screen.findByRole('img', { name: /order verification qr code/i })).toBeInTheDocument();
  });

  it('renders items list for the order', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder());
    render(<OrderDetail orderId="ord-abc12345" />);
    await screen.findByText('Full Blood Count');
    expect(screen.getByText('Fasting required')).toBeInTheDocument();
    expect(screen.getByText('Lipid Panel')).toBeInTheDocument();
  });

  it('shows the Active status pill for active orders', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(await screen.findByLabelText('Status: Active')).toBeInTheDocument();
  });

  it('hides QR and shows explanation for a superseded order', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'superseded', token: null }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);
    const banner = await screen.findByTestId('qr-invalid-banner');
    expect(banner).toHaveTextContent(/superseded/i);
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
  });

  it('hides QR and shows explanation for an expired order', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'expired', token: null }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);
    const banner = await screen.findByTestId('qr-invalid-banner');
    expect(banner).toHaveTextContent(/expired/i);
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
  });

  it('hides QR for a cancelled order and shows a message', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'cancelled', token: null }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);
    const banner = await screen.findByTestId('qr-invalid-banner');
    expect(banner).toHaveTextContent(/cancelled/i);
  });

  // --- Step 2a: fulfilled + non-null token must never render QR ---
  it('hides QR for a fulfilled order even when the server sends a non-null token', async () => {
    // Arrange: fulfilled order with a non-null token (server bug scenario)
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'fulfilled', token: 'tok_should_not_be_shown' }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);

    // Assert: invalid banner shown, QR not rendered
    const banner = await screen.findByTestId('qr-invalid-banner');
    expect(banner).toHaveTextContent(/already been fulfilled/i);
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /full-screen qr/i })).not.toBeInTheDocument();
  });

  it('hides QR for a fulfilled order with null token', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'fulfilled', token: null }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);
    const banner = await screen.findByTestId('qr-invalid-banner');
    expect(banner).toHaveTextContent(/already been fulfilled/i);
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
  });

  // --- Step 2b: active order with null token shows pending fallback ---
  it('shows a "code not available yet" fallback for an active order with no token', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'active', token: null }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);

    const pending = await screen.findByTestId('qr-pending-banner');
    expect(pending).toHaveTextContent(/isn't available yet/i);
    // Must not show the invalid-order banner or the QR
    expect(screen.queryByTestId('qr-invalid-banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /qr code/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /full-screen qr/i })).not.toBeInTheDocument();
  });

  it('shows an error message when the API call fails', async () => {
    vi.mocked(ordersService.getOrder).mockRejectedValue(
      Object.assign(new Error('Order not found'), { name: 'ApiError', status: 404 }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);
    await waitFor(() => {
      expect(screen.getByText(/could not load this order/i)).toBeInTheDocument();
    });
  });

  it('renders the doctor name in the meta section', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder());
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(await screen.findByText('Dr. Adaeze Okonkwo')).toBeInTheDocument();
  });

  it('renders the facility name when present', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ facilityName: 'CarePoint Lab' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(await screen.findByText('CarePoint Lab')).toBeInTheDocument();
  });

  it('does not render facility row when facilityName is null', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ facilityName: null }));
    render(<OrderDetail orderId="ord-abc12345" />);
    await screen.findByTestId('order-detail');
    expect(screen.queryByText('Facility')).not.toBeInTheDocument();
  });

  it('shows the "Full-screen QR" button for active orders', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(await screen.findByRole('button', { name: /full-screen qr/i })).toBeInTheDocument();
  });

  it('does not show "Full-screen QR" for superseded orders', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(
      makeOrder({ status: 'superseded', token: null }),
    );
    render(<OrderDetail orderId="ord-abc12345" />);
    await screen.findByTestId('qr-invalid-banner');
    expect(screen.queryByRole('button', { name: /full-screen qr/i })).not.toBeInTheDocument();
  });

  it('shows the Print button for every order state', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(await screen.findByRole('button', { name: /print/i })).toBeInTheDocument();
  });

  // --- Step 2c: full-screen overlay — Escape, focus management, aria-modal ---
  it('full-screen overlay has aria-modal="true"', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    const openBtn = await screen.findByRole('button', { name: /open full-screen qr/i });
    await userEvent.click(openBtn);
    const dialog = screen.getByRole('dialog', { name: /full-screen qr code/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('moves focus to the close button when the overlay opens', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    const openBtn = await screen.findByRole('button', { name: /open full-screen qr/i });
    await userEvent.click(openBtn);
    const closeBtn = screen.getByRole('button', { name: /close full-screen qr/i });
    expect(closeBtn).toHaveFocus();
  });

  it('closes the overlay and restores focus on Escape', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    const openBtn = await screen.findByRole('button', { name: /open full-screen qr/i });
    await userEvent.click(openBtn);
    // Overlay is open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape
    await userEvent.keyboard('{Escape}');

    // Overlay gone
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Focus returned to trigger
    expect(screen.getByRole('button', { name: /open full-screen qr/i })).toHaveFocus();
  });

  it('closes the overlay via the close button and restores focus', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(makeOrder({ status: 'active' }));
    render(<OrderDetail orderId="ord-abc12345" />);
    const openBtn = await screen.findByRole('button', { name: /open full-screen qr/i });
    await userEvent.click(openBtn);
    const closeBtn = screen.getByRole('button', { name: /close full-screen qr/i });
    await userEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open full-screen qr/i })).toHaveFocus();
  });
});
