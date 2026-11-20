import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '../test/render';
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

  function desktopNavHrefs(): string[] {
    const nav = screen.getByRole('navigation', { name: 'Main' });
    return within(nav)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
      .filter((href) => href !== '/settings/notifications');
  }

  it('shows every routed patient screen in the nav, with secondary entries grouped', () => {
    renderLayout('patient');
    expect(screen.getByRole('link', { name: 'Care journey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dependents' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Health profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Facilities' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/patient/orders');
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/payments');
    expect(desktopNavHrefs()).toEqual([
      '/patient/search',
      '/care',
      '/patient/dependents',
      '/patient/health',
      '/patient/facilities',
      '/patient/orders',
      '/payments',
      '/patient/settings',
    ]);
  });

  it('shows doctor nav items', () => {
    renderLayout('doctor');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/doctor');
    expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument();
    expect(desktopNavHrefs()).toEqual(['/doctor', '/doctor/messages', '/doctor/insights']);
  });

  it('shows every routed facility screen in the nav, with settings grouped', () => {
    renderLayout('facility');
    expect(screen.getByRole('link', { name: 'Queue' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verify Order' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Payouts' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insights' })).toHaveAttribute('href', '/facility/insights');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/facility/settings');
    expect(desktopNavHrefs()).toEqual([
      '/facility',
      '/facility/verify',
      '/facility/team',
      '/facility/payments',
      '/facility/integrations',
      '/facility/insights',
      '/facility/settings',
    ]);
  });

  it('shows admin nav items', () => {
    renderLayout('admin');
    expect(screen.getByRole('link', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Referrals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit trail' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flags' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'System' })).toBeInTheDocument();
    expect(desktopNavHrefs()).toEqual([
      '/admin',
      '/admin/verifications',
      '/admin/verification',
      '/admin/referrals',
      '/admin/disputes',
      '/admin/audit',
      '/admin/flags',
      '/admin/catalogs',
      '/admin/system',
    ]);
  });

  it('hides role-inappropriate items for other roles', () => {
    renderLayout('patient');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Queue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Verifications' })).not.toBeInTheDocument();
  });

  it('shows user email and role badge when signed in', () => {
    renderLayout('doctor');
    expect(screen.getAllByText('doctor@docforum.org').length).toBeGreaterThan(0);
    expect(screen.getAllByText('doctor').length).toBeGreaterThan(0);
  });

  it('links the footer to the analytics disclosure, inside the router', () => {
    renderLayout();
    const link = screen.getByRole('link', { name: 'Privacy & analytics' });
    // /privacy is now the public privacy page; the analytics page is /privacy/analytics.
    expect(link).toHaveAttribute('href', '/privacy/analytics');
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
    // Icon-only: the name comes from aria-label, never from a text glyph.
    expect(close).not.toHaveTextContent(/\S/);
    const icon = close.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(close);
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });
});
