import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrderConfirmPanel } from './OrderConfirmPanel';
import type { OrderConfirmationWindow } from '../../../types/models';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('OrderConfirmPanel', () => {
  const defaultProps = {
    orderId: 'order-123',
    updatedAt: '2024-01-01T00:00:00Z',
    confirmationWindow: {
      deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      inactionConsequence: 'auto_confirm',
    } as OrderConfirmationWindow,
  };

  it('renders the confirm panel with deadline', () => {
    render(<OrderConfirmPanel {...defaultProps} />, { wrapper });

    expect(screen.getByText('Confirm receipt or report a problem')).toBeInTheDocument();
    expect(screen.getByText(/day.*remaining/i)).toBeInTheDocument();
    expect(screen.getByText('Confirm receipt')).toBeInTheDocument();
    expect(screen.getByText('Report a problem')).toBeInTheDocument();
  });

  it('shows expired state when deadline has passed', () => {
    const expiredProps = {
      ...defaultProps,
      confirmationWindow: {
        deadlineAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
        inactionConsequence: 'escrow_held',
      } as OrderConfirmationWindow,
    };

    render(<OrderConfirmPanel {...expiredProps} />, { wrapper });

    expect(screen.getByText('Confirmation window closed')).toBeInTheDocument();
    expect(screen.getByText(/time to confirm or report a problem has passed/i)).toBeInTheDocument();
    expect(screen.queryByText('Confirm receipt')).not.toBeInTheDocument();
    expect(screen.queryByText('Report a problem')).not.toBeInTheDocument();
  });

  it('opens report dialog when Report a problem is clicked', () => {
    render(<OrderConfirmPanel {...defaultProps} />, { wrapper });

    const reportButton = screen.getByText('Report a problem');
    fireEvent.click(reportButton);

    expect(screen.getByText('Report a problem')).toBeInTheDocument();
    expect(screen.getByText('Reason *')).toBeInTheDocument();
    expect(screen.getByText('Details *')).toBeInTheDocument();
  });

  it('closes report dialog when Cancel is clicked', () => {
    render(<OrderConfirmPanel {...defaultProps} />, { wrapper });

    const reportButton = screen.getByText('Report a problem');
    fireEvent.click(reportButton);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('Reason *')).not.toBeInTheDocument();
  });

  it('shows validation error when submitting without reason', async () => {
    render(<OrderConfirmPanel {...defaultProps} />, { wrapper });

    const reportButton = screen.getByText('Report a problem');
    fireEvent.click(reportButton);

    const submitButton = screen.getByText('Submit report');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Please select a reason/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when description is too short', async () => {
    render(<OrderConfirmPanel {...defaultProps} />, { wrapper });

    const reportButton = screen.getByText('Report a problem');
    fireEvent.click(reportButton);

    const reasonSelect = screen.getByLabelText('Reason *');
    fireEvent.change(reasonSelect, { target: { value: 'not_received' } });

    const descriptionTextarea = screen.getByLabelText('Details *');
    fireEvent.change(descriptionTextarea, { target: { value: 'too short' } });

    const submitButton = screen.getByText('Submit report');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('shows character count for description', () => {
    render(<OrderConfirmPanel {...defaultProps} />, { wrapper });

    const reportButton = screen.getByText('Report a problem');
    fireEvent.click(reportButton);

    const descriptionTextarea = screen.getByLabelText('Details *');
    fireEvent.change(descriptionTextarea, { target: { value: 'test description' } });

    expect(screen.getByText('15 / 500 characters')).toBeInTheDocument();
  });

  it('displays different inaction consequences', () => {
    const propsWithEscrowHeld = {
      ...defaultProps,
      confirmationWindow: {
        ...defaultProps.confirmationWindow,
        inactionConsequence: 'escrow_held' as const,
      },
    };

    render(<OrderConfirmPanel {...propsWithEscrowHeld} />, { wrapper });

    expect(screen.getByText(/payment will remain held in escrow/i)).toBeInTheDocument();
  });

  it('formats deadline correctly for hours', () => {
    const propsWithHours = {
      ...defaultProps,
      confirmationWindow: {
        ...defaultProps.confirmationWindow,
        deadlineAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // 5 hours
      },
    };

    render(<OrderConfirmPanel {...propsWithHours} />, { wrapper });

    expect(screen.getByText(/5 hours? remaining/i)).toBeInTheDocument();
  });

  it('formats deadline correctly for less than an hour', () => {
    const propsWithMinutes = {
      ...defaultProps,
      confirmationWindow: {
        ...defaultProps.confirmationWindow,
        deadlineAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      },
    };

    render(<OrderConfirmPanel {...propsWithMinutes} />, { wrapper });

    expect(screen.getByText(/Less than 1 hour remaining/i)).toBeInTheDocument();
  });
});
