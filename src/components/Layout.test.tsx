import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '../test/render';
import { Layout } from './Layout';
import { useAuthStore } from '../store/auth-store';
import { PUBLIC_CONTENT_ROUTES } from '../pages/public-page-map';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

function signIn(role: 'patient' | 'doctor' | 'facility' | 'admin') {
  useAuthStore.setState({
    accessToken: `${role}-token`,
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, emailVerifiedAt: null, createdAt: '', updatedAt: '' },
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

  it('offers no logout control to a signed-out visitor (issue #214)', () => {
    renderLayout();
    expect(screen.queryByRole('button', { name: 'Log out', hidden: true })).not.toBeInTheDocument();
  });

  it('offers no logout control while a session is only half restored (issue #214)', () => {
    useAuthStore.setState({
      accessToken: null,
      user: { id: 'patient-1', email: 'patient@docforum.org', role: 'patient', createdAt: '', updatedAt: '' },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Layout />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Log out', hidden: true })).not.toBeInTheDocument();
  });

  it('offers the logout control once signed in (issue #214)', () => {
    renderLayout('patient');
    expect(screen.getAllByRole('button', { name: 'Log out', hidden: true }).length).toBeGreaterThan(0);
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
    expect(screen.getByRole('link', { name: 'Lab results' })).toHaveAttribute('href', '/patient/results');
    expect(screen.getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/patient/orders');
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/payments');
    expect(desktopNavHrefs()).toEqual([
      '/patient/search',
      '/patient/doctors',
      '/patient/appointments',
      '/care',
      '/patient/dependents',
      '/patient/health',
      '/patient/facilities',
      '/patient/results',
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
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/admin/users');
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/admin/payments/console');
    expect(screen.getByRole('link', { name: 'Referrals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Audit trail' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Flags' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'System' })).toBeInTheDocument();
    expect(desktopNavHrefs()).toEqual([
      '/admin',
      '/admin/users',
      '/admin/payments/console',
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

  it('links the footer accessibility item to a real public route', () => {
    renderLayout();
    const link = screen.getByRole('link', { name: 'Accessibility' });
    expect(link).toHaveAttribute('href', '/accessibility');
    expect(PUBLIC_CONTENT_ROUTES.map((route) => `/${route.path}`)).toContain(
      link.getAttribute('href'),
    );
  });

  it('titles the document after the current route, translated', () => {
    const { unmount } = render(<Layout />, { route: '/patient/orders' });
    expect(document.title).toBe('My orders · DocForum');
    unmount();

    render(<Layout />, { route: '/patient/orders', locale: 'es' });
    expect(document.title).toBe('Mis órdenes · DocForum');
  });

  it('leaves the title to the public pages that own their metadata', () => {
    document.title = 'Accessibility statement — DocForum';

    render(<Layout />, { route: '/accessibility' });

    expect(document.title).toBe('Accessibility statement — DocForum');
  });

  it('has a skip-to-content link reachable by keyboard', () => {
    renderLayout();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveAttribute('href', '#main-content');
  });

  it('keeps the closed drawer inert and untabbable', () => {
    renderLayout('patient');
    const drawer = document.getElementById('mobile-drawer');
    expect(drawer).not.toBeNull();
    // happy-dom doesn't implement `inert`; assert the attribute that makes the
    // closed drawer unreachable in a real browser, and rely on Playwright (axe)
    // for the behavioural check.
    expect(drawer).toHaveAttribute('inert');
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(drawer).not.toHaveAttribute('aria-modal');
    // The page behind is interactive while the drawer is closed.
    expect(screen.getByRole('main')).not.toHaveAttribute('inert');
    expect(document.getElementById('main-content')?.closest('[inert]')).toBeNull();
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

  it('makes the open drawer a modal dialog and makes the page behind inert', () => {
    renderLayout('patient');
    const menu = screen.getByRole('button', { name: 'Toggle navigation menu' });

    fireEvent.click(menu);

    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).not.toHaveAttribute('inert');
    expect(dialog).not.toHaveAttribute('aria-hidden');
    // The nav lives inside the dialog and keeps its own label.
    expect(within(dialog).getByRole('navigation', { name: 'Mobile navigation' })).toBeTruthy();
    // Everything behind the drawer is inert while it is open.
    expect(document.getElementById('main-content')?.closest('[inert]')).not.toBeNull();
    expect(menu.closest('[inert]')).not.toBeNull();
  });

  it('traps focus in the open drawer and returns it to the toggle on Escape', () => {
    renderLayout('patient');
    const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' });
    toggle.focus();

    fireEvent.click(toggle);

    const dialog = screen.getByRole('dialog', { name: 'Mobile navigation menu' });
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    );
    expect(focusable.length).toBeGreaterThan(1);
    // Focus moves into the dialog when it opens.
    expect(document.activeElement).toBe(focusable[0]);

    // Tab from the last item wraps to the first.
    focusable[focusable.length - 1].focus();
    fireEvent.keyDown(focusable[focusable.length - 1], { key: 'Tab' });
    expect(document.activeElement).toBe(focusable[0]);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Mobile navigation menu' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(toggle);
  });
});
