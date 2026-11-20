import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import { createSeedDb, MOCK_ACCESS_TOKEN } from '../../../mocks/fixtures';
import { useAuthStore } from '../../../store/auth-store';
import type { OrderFulfillmentProgress } from '../../../types/models';
import * as ordersService from '../../../services/orders-service';
import { PatientOrderDetail } from './PatientOrderDetail';
import { PatientOrdersList } from './PatientOrdersList';

vi.mock('../../../services/orders-service');

const seedDb = createSeedDb();
const partialOrder = seedDb.patientOrders.find((order) => order.id === 'ord-demo-rx-1')!;
const issuedOrder = seedDb.patientOrders.find((order) => order.id === 'ord-demo-lab-1')!;
const fulfilledOrder = seedDb.patientOrders.find((order) => order.id === 'ord-demo-rx-2')!;
const supersededOrder = seedDb.patientOrders.find((order) => order.id === 'ord-demo-rx-0')!;

const PROGRESS: Record<string, OrderFulfillmentProgress> = {
  [partialOrder.id]: { totalItems: 3, dispensedItems: 2, status: 'partially_fulfilled' },
  [issuedOrder.id]: { totalItems: 2, dispensedItems: 0, status: 'issued' },
  [fulfilledOrder.id]: { totalItems: 1, dispensedItems: 1, status: 'fulfilled' },
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: MOCK_ACCESS_TOKEN,
    user: {
      id: 'usr-patient-demo',
      email: 'pat.placeholder@example.test',
      role: 'patient',
      createdAt: '',
      updatedAt: '',
    },
  });

  vi.mocked(ordersService.getOrderFulfillmentProgress).mockImplementation(async (orderId) => {
    const progress = PROGRESS[orderId];
    if (!progress) throw new Error(`No progress fixture for ${orderId}`);
    return progress;
  });
});

describe('patient orders list (#262)', () => {
  it('shows all three item-level states with counts, and hides superseded versions', async () => {
    vi.mocked(ordersService.listMyOrders).mockResolvedValue(seedDb.patientOrders);

    render(<PatientOrdersList />);

    expect(await screen.findByRole('heading', { name: /my orders/i })).toBeInTheDocument();

    expect(await screen.findByText('2 of 3 items dispensed')).toBeInTheDocument();
    expect(screen.getByText('Partially filled')).toBeInTheDocument();

    expect(await screen.findByText('0 of 2 items dispensed')).toBeInTheDocument();
    expect(screen.getByText('Issued')).toBeInTheDocument();

    expect(await screen.findByText('1 of 1 item dispensed')).toBeInTheDocument();
    expect(screen.getByText('Fulfilled')).toBeInTheDocument();

    expect(screen.getByText(/1 earlier version was replaced/i)).toBeInTheDocument();
    expect(screen.queryByText(/superseded fake/i)).not.toBeInTheDocument();
    expect(ordersService.getOrderFulfillmentProgress).not.toHaveBeenCalledWith(
      supersededOrder.id,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('patient order detail (#262)', () => {
  it('shows "2 of 3 items dispensed" and offers the remaining-items picker when partially fulfilled', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(partialOrder);
    vi.mocked(ordersService.getEligibleFacilitiesForRemainingItems).mockResolvedValue(
      seedDb.facilities.filter((facility) => facility.id === 'fac-demo-pharmacy-2'),
    );

    render(<PatientOrderDetail orderId={partialOrder.id} />);

    expect(
      await screen.findByRole('heading', { name: /demo three-item prescription/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('2 of 3 items dispensed')).toBeInTheDocument();
    expect(screen.getByText('Partially filled')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /get remaining items elsewhere/i }),
    );
    expect(
      await screen.findByRole('dialog', { name: /get remaining items elsewhere/i }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText(/vitamin d 1000 iu/i)).length).toBeGreaterThan(0);
  });

  it('shows the issued state with nothing dispensed and no picker link', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(issuedOrder);

    render(<PatientOrderDetail orderId={issuedOrder.id} />);

    expect(
      await screen.findByRole('heading', { name: /demo fasting blood panel/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('0 of 2 items dispensed')).toBeInTheDocument();
    expect(screen.getByText('Issued')).toBeInTheDocument();
    expect(screen.getByText(/nothing has been dispensed yet/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /get remaining items elsewhere/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the fulfilled state as complete', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(fulfilledOrder);

    render(<PatientOrderDetail orderId={fulfilledOrder.id} />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /demo metformin/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('1 of 1 item dispensed')).toBeInTheDocument();
    expect(screen.getByText('Fulfilled')).toBeInTheDocument();
    expect(screen.getByText(/all 1 item has been dispensed/i)).toBeInTheDocument();
  });

  it('does not show progress for a superseded version', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(supersededOrder);

    render(<PatientOrderDetail orderId={supersededOrder.id} />);

    expect(
      await screen.findByRole('heading', { name: /this order was superseded/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/only shown for the current version/i)).toBeInTheDocument();
    expect(ordersService.getOrderFulfillmentProgress).not.toHaveBeenCalled();
  });

  it('requests progress with the order id and its order type', async () => {
    vi.mocked(ordersService.getPatientOrder).mockResolvedValue(issuedOrder);

    render(<PatientOrderDetail orderId={issuedOrder.id} />);
    await screen.findByText('0 of 2 items dispensed');

    expect(ordersService.getOrderFulfillmentProgress).toHaveBeenCalledWith(
      issuedOrder.id,
      'lab_order',
      MOCK_ACCESS_TOKEN,
      expect.anything(),
    );
  });
});
