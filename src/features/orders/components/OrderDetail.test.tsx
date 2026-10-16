import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/render';
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

  it('shows a loading spinner while fetching', () => {
    vi.mocked(ordersService.getOrder).mockReturnValue(new Promise(() => {}));
    render(<OrderDetail orderId="ord-abc12345" />);
    expect(screen.getByLabelText('Loading order…')).toBeInTheDocument();
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
});
