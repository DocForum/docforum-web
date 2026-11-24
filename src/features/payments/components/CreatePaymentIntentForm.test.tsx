import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { CreatePaymentIntentForm } from './CreatePaymentIntentForm';
import { useAuthStore } from '../../../store/auth-store';
import * as paymentsService from '../../../services/payments-service';

vi.mock('../../../services/payments-service');

describe('CreatePaymentIntentForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(paymentsService.createPaymentIntent).mockReset();
  });

  it('shows validation errors instead of submitting when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<CreatePaymentIntentForm onCreated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText('Order id is required.')).toBeInTheDocument();
    expect(screen.getByText('Patient profile id is required.')).toBeInTheDocument();
    expect(screen.getByText('Facility id is required.')).toBeInTheDocument();
    expect(screen.getByText('Amount (stroops) is required.')).toBeInTheDocument();
    expect(paymentsService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('creates a payment intent with valid data', async () => {
    vi.mocked(paymentsService.createPaymentIntent).mockResolvedValue({
      id: 'intent-1',
    } as never);
    const user = userEvent.setup();
    render(<CreatePaymentIntentForm onCreated={vi.fn()} />);

    await user.type(screen.getByLabelText(/order id/i), 'order-1');
    await user.type(screen.getByLabelText(/patient profile id/i), 'patient-1');
    await user.type(screen.getByLabelText(/facility id/i), 'facility-1');
    await user.type(screen.getByLabelText(/amount \(stroops\)/i), '1000');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(paymentsService.createPaymentIntent).toHaveBeenCalledWith(
        {
          orderType: 'lab_order',
          orderId: 'order-1',
          patientProfileId: 'patient-1',
          facilityId: 'facility-1',
          amountStroops: '1000',
        },
        'test-token',
      ),
    );
  });
});
