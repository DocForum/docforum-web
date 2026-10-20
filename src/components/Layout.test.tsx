import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/render';
import { Layout } from './Layout';
import { useAuthStore } from '../store/auth-store';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

function signIn(role: 'patient' | 'doctor' | 'facility' | 'admin') {
  useAuthStore.setState({
    accessToken: `${role}-token`,
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderLayout(role?: 'patient' | 'doctor' | 'facility' | 'admin') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (role) signIn(role);
  else useAuthStore.setState({ accessToken: null, user: null });

  return render(
    <QueryClientProvider client={queryClient}>
      <Layout />
    </QueryClientProvider>,
  );
}

describe('Layout — role-aware navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows log in / sign up when unauthenticated', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('shows patient nav items', () => {
    renderLayout('patient');
    expect(screen.getByRole('link', { name: 'Care journey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dependents' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Health profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Facilities' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows doctor nav items', () => {
    renderLayout('doctor');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument();
  });

  it('shows facility nav items', () => {
    renderLayout('facility');
    expect(screen.getByRole('link', { name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify Order' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payouts' })).toBeInTheDocument();
  });

  it('shows admin nav items', () => {
    renderLayout('admin');
    expect(screen.getByRole('link', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Referrals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit trail' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flags' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'System' })).toBeInTheDocument();
  });

  it('hides role-inappropriate items for other roles', () => {
    renderLayout('patient');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Queue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Payments' })).not.toBeInTheDocument();
  });

  it('shows user email and role badge when signed in', () => {
    renderLayout('doctor');
    expect(screen.getAllByText('doctor@docforum.org').length).toBeGreaterThan(0);
    expect(screen.getAllByText('doctor').length).toBeGreaterThan(0);
  });

  it('has a skip-to-content link reachable by keyboard', () => {
    renderLayout();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  it('opens the mobile drawer on menu toggle and closes it', () => {
    renderLayout('patient');
    const menu = screen.getByRole('button', { name: 'Toggle navigation menu' });
    expect(menu).toBeInTheDocument();

    // Drawer is hidden from the accessibility tree when closed
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();

    // Click to open (simulated via fireEvent)
    fireEvent.click(menu);

    // Now the drawer navigation should be in the accessibility tree
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();

    // Close button closes it
    const close = screen.getByRole('button', { name: 'Close navigation menu' });
    fireEvent.click(close);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });
});
