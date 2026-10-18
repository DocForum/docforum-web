import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { OrderVerifyView } from './OrderVerifyView';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as orderVerifyService from '../../../services/order-verify-service';

vi.mock('../../../services/order-verify-service');

describe('OrderVerifyView & Camera QR Scanner', () => {
  const mockTrackStop = vi.fn();
  const mockTrack = { stop: mockTrackStop } as unknown as MediaStreamTrack;
  const mockStream = {
    getTracks: vi.fn(() => [mockTrack]),
  } as unknown as MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      accessToken: 'facility-token',
      user: {
        id: 'usr-1',
        email: 'facility@docforum.org',
        role: 'facility',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });

    // Mock mediaDevices.getUserMedia
    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  });

  it('tears down camera media stream tracks when component unmounts', async () => {
    const { unmount } = render(<OrderVerifyView />);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    unmount();

    expect(mockTrackStop).toHaveBeenCalled();
  });

  it('allows manual entry fallback and verifies valid order state with fulfillment jump', async () => {
    vi.mocked(orderVerifyService.verifyOrderToken).mockResolvedValue({
      status: 'valid',
      token: 'ord_tok_valid_123',
      verifiedAt: '2026-10-18T12:00:00Z',
      order: {
        orderId: 'ord-rx-101',
        orderType: 'prescription',
        patientName: 'John Doe',
        medicationOrTest: 'Amoxicillin 500mg',
        instructions: 'Take 1 capsule three times daily',
        issuedAt: '2026-10-17T10:00:00Z',
        expiresAt: '2026-11-17T10:00:00Z',
      },
    });

    const user = userEvent.setup();
    render(<OrderVerifyView />);

    // Switch to manual mode
    await user.click(screen.getByRole('tab', { name: /manual code entry/i }));

    const input = screen.getByLabelText(/order verification token/i);
    await user.type(input, 'ord_tok_valid_123');
    await user.click(screen.getByRole('button', { name: /verify order/i }));

    expect(await screen.findByText(/valid & ready/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 500mg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /proceed to fulfil/i })).toBeInTheDocument();
  });

  it('shows superseded order state with replacement order reference and warning', async () => {
    vi.mocked(orderVerifyService.verifyOrderToken).mockResolvedValue({
      status: 'superseded',
      token: 'ord_tok_superseded_456',
      verifiedAt: '2026-10-18T12:00:00Z',
      order: {
        orderId: 'ord-rx-88',
        orderType: 'prescription',
        patientName: 'Jane Smith',
        medicationOrTest: 'Lisinopril 10mg',
        instructions: 'Superseded dosage',
        issuedAt: '2026-10-01T10:00:00Z',
        expiresAt: '2026-11-01T10:00:00Z',
        supersededBy: 'ord-rx-94-v2',
      },
    });

    const user = userEvent.setup();
    render(<OrderVerifyView />);

    await user.click(screen.getByRole('tab', { name: /manual code entry/i }));
    await user.type(screen.getByLabelText(/order verification token/i), 'ord_tok_superseded_456');
    await user.click(screen.getByRole('button', { name: /verify order/i }));

    expect(await screen.findByText('⚠ Superseded')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/order superseded/i);
    expect(screen.getByText(/ord-rx-94-v2/i)).toBeInTheDocument();
    expect(screen.getByText(/do not dispense or fulfill/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proceed to fulfil/i })).not.toBeInTheDocument();
  });

  it('shows expired order state', async () => {
    vi.mocked(orderVerifyService.verifyOrderToken).mockResolvedValue({
      status: 'expired',
      token: 'ord_tok_expired_789',
      verifiedAt: '2026-10-18T12:00:00Z',
      order: {
        orderId: 'ord-lab-55',
        orderType: 'lab',
        patientName: 'Robert Garcia',
        medicationOrTest: 'Comprehensive Metabolic Panel',
        issuedAt: '2026-08-01T10:00:00Z',
        expiresAt: '2026-09-01T10:00:00Z',
      },
    });

    const user = userEvent.setup();
    render(<OrderVerifyView />);

    await user.click(screen.getByRole('tab', { name: /manual code entry/i }));
    await user.type(screen.getByLabelText(/order verification token/i), 'ord_tok_expired_789');
    await user.click(screen.getByRole('button', { name: /verify order/i }));

    expect(await screen.findByText('✕ Expired')).toBeInTheDocument();
    expect(screen.getByText(/expired orders cannot be fulfilled/i)).toBeInTheDocument();
  });

  it('shows fulfilled order state with prior fulfillment details', async () => {
    vi.mocked(orderVerifyService.verifyOrderToken).mockResolvedValue({
      status: 'fulfilled',
      token: 'ord_tok_fulfilled_111',
      verifiedAt: '2026-10-18T12:00:00Z',
      order: {
        orderId: 'ord-rx-71',
        orderType: 'prescription',
        patientName: 'Alice Johnson',
        medicationOrTest: 'Atorvastatin 20mg',
        issuedAt: '2026-10-10T10:00:00Z',
        expiresAt: '2026-11-10T10:00:00Z',
        fulfilledAt: '2026-10-15T14:22:00Z',
        fulfilledByFacility: 'St. Jude Pharmacy',
      },
    });

    const user = userEvent.setup();
    render(<OrderVerifyView />);

    await user.click(screen.getByRole('tab', { name: /manual code entry/i }));
    await user.type(screen.getByLabelText(/order verification token/i), 'ord_tok_fulfilled_111');
    await user.click(screen.getByRole('button', { name: /verify order/i }));

    expect(await screen.findByText('ℹ Already Fulfilled')).toBeInTheDocument();
    expect(screen.getByText(/St. Jude Pharmacy/i)).toBeInTheDocument();
    expect(screen.getByText(/duplicate dispensing is prohibited/i)).toBeInTheDocument();
  });

  it('shows not eligible state with reason', async () => {
    vi.mocked(orderVerifyService.verifyOrderToken).mockResolvedValue({
      status: 'not_eligible',
      token: 'ord_tok_ineligible_999',
      verifiedAt: '2026-10-18T12:00:00Z',
      message: 'Restricted network tier: Facility is not authorized for this specialty drug.',
      order: null,
    });

    const user = userEvent.setup();
    render(<OrderVerifyView />);

    await user.click(screen.getByRole('tab', { name: /manual code entry/i }));
    await user.type(screen.getByLabelText(/order verification token/i), 'ord_tok_ineligible_999');
    await user.click(screen.getByRole('button', { name: /verify order/i }));

    expect(await screen.findByText('✕ Not Eligible')).toBeInTheDocument();
    expect(screen.getByText(/Restricted network tier/i)).toBeInTheDocument();
  });

  it('displays rate-limit error (429) clearly', async () => {
    vi.mocked(orderVerifyService.verifyOrderToken).mockRejectedValue(
      new ApiError('Too many verification attempts. Verification is rate-limited to protect tokens against enumeration.', 429),
    );

    const user = userEvent.setup();
    render(<OrderVerifyView />);

    await user.click(screen.getByRole('tab', { name: /manual code entry/i }));
    await user.type(screen.getByLabelText(/order verification token/i), 'rapid_guess_attempt');
    await user.click(screen.getByRole('button', { name: /verify order/i }));

    expect(await screen.findByText(/rate limit exceeded \(429\)/i)).toBeInTheDocument();
    expect(screen.getByText(/too many verification attempts/i)).toBeInTheDocument();
  });
});
