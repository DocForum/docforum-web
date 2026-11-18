import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Link,
  NavLink as RRNavLink,
  useLocation,
  useNavigate,
  Outlet,
} from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useT } from '../i18n/useT';
import { ErrorBoundary } from './ErrorBoundary';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLogout } from '../features/auth/hooks/useLogout';
import { ProfileSwitcher } from '../features/dependents/components/ProfileSwitcher';
import { Button } from './Button';
import { Logo } from './Logo';
import { UnreadBadge } from '../features/messaging/components/UnreadBadge';
import { OfflineBanner } from './OfflineBanner';
import { RecordSearch } from '../features/search-records/components/RecordSearch';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import { PageHeader } from './PageHeader';
import { Flag } from './Flag';
import { useRealtimeCacheSync } from '../hooks/useRealtimeCacheSync';
import styles from './Layout.module.css';

/** Roles a user may have. Mirrored from docforum-core's model. */
type Role = 'patient' | 'doctor' | 'facility' | 'admin';

/** Derive a human-readable page title from the current route path. */
function routeTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Home';

  const last = segments[segments.length - 1];
  const label = last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Id\b/g, 'ID')
    .replace(/Url\b/g, 'URL');

  const roleRoots: Record<string, string> = {
    patient: 'Patient',
    doctor: 'Doctor',
    facility: 'Facility',
    admin: 'Admin',
  };

  if (segments.length === 1 && roleRoots[last]) return `${roleRoots[last]} dashboard`;
  if (segments.length >= 2 && roleRoots[segments[0]]) {
    return `${roleRoots[segments[0]]} · ${label}`;
  }
  return label;
}

/** A single navigation entry. `badge` renders a small count (e.g. unread). */
interface NavItem {
  to: string;
  label: string;
  /** Roles allowed to see this item. Omit for unauthenticated items. */
  roles?: Role[];
  badge?: number;
  /** Existing i18n id for the visible label; English `label` is the fallback. */
  messageId?: string;
}

/**
 * Role-aware navigation entries. Items are gated by role so unbuilt or
 * role-inappropriate screens never appear. The active item is resolved by
 * `NavLink`'s `end` matching against the current location.
 */
function roleNavItems(userRole: Role | null): NavItem[] {
  if (!userRole) {
    return [
      { to: '/login', label: 'Log in', roles: [], messageId: 'nav.logIn' },
      { to: '/signup', label: 'Sign up', roles: [], messageId: 'nav.signUp' },
    ];
  }

  const base: NavItem[] = [];

  if (userRole === 'patient') {
    base.push(
      { to: '/patient/search', label: 'Find a doctor', roles: ['patient'], messageId: 'nav.findADoctor' },
      { to: '/care', label: 'Care journey', roles: ['patient', 'doctor'], messageId: 'nav.careJourney' },
      { to: '/patient/dependents', label: 'Dependents', roles: ['patient'] },
      { to: '/patient/health', label: 'Health profile', roles: ['patient'] },
      { to: '/patient/facilities', label: 'Facilities', roles: ['patient'] },
      { to: '/patient/settings', label: 'Settings', roles: ['patient'], messageId: 'nav.settings' },
    );
  } else if (userRole === 'doctor') {
    base.push(
      { to: '/doctor', label: 'Dashboard', roles: ['doctor'], messageId: 'nav.dashboard' },
      { to: '/doctor/messages', label: 'Messages', roles: ['doctor'], badge: 0 },
      { to: '/doctor/insights', label: 'Insights', roles: ['doctor'], messageId: 'nav.insights' },
    );
  } else if (userRole === 'facility') {
    base.push(
      { to: '/facility', label: 'Queue', roles: ['facility'], messageId: 'nav.queue' },
      { to: '/facility/verify', label: 'Verify Order', roles: ['facility'] },
      { to: '/facility/team', label: 'Team', roles: ['facility'], messageId: 'nav.team' },
      { to: '/facility/payments', label: 'Payouts', roles: ['facility'] },
      { to: '/facility/integrations', label: 'Integrations', roles: ['facility'] },
    );
  } else if (userRole === 'admin') {
    base.push(
      { to: '/admin', label: 'Payments', roles: ['admin'] },
      { to: '/admin/verifications', label: 'Verifications', roles: ['admin'] },
      { to: '/admin/verification', label: 'Specialty claims', roles: ['admin'] },
      { to: '/admin/referrals', label: 'Referrals', roles: ['admin'] },
      { to: '/admin/disputes', label: 'Disputes', roles: ['admin'] },
      { to: '/admin/audit', label: 'Audit trail', roles: ['admin'] },
      { to: '/admin/flags', label: 'Flags', roles: ['admin'] },
      { to: '/admin/system', label: 'System', roles: ['admin'] },
    );
  }

  return base.filter((item) => !item.roles || item.roles.includes(userRole));
}

export function Layout() {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  useRealtimeCacheSync();
  const location = useLocation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  const items = useMemo(() => roleNavItems(user?.role ?? null), [user?.role]);

  // Close the drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // SPA route changes otherwise leave focus on the clicked link. Move it
  // to the main landmark so keyboard/screen-reader users start at the new
  // content, without stealing focus on first paint.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Trap focus inside the drawer while it's open (keyboard access).
  useEffect(() => {
    if (!drawerOpen || !drawerRef.current) return undefined;
    const drawer = drawerRef.current;
    const focusables = drawer.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    drawer.addEventListener('keydown', handleKey);
    first?.focus();
    return () => drawer.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  const logout = () => {
    logoutMutation.mutate(undefined, { onSuccess: () => navigate('/login', { replace: true }) });
    closeDrawer();
  };

  return (
    <div className={styles.shell}>
      {/* Skip to content for keyboard users */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <OfflineBanner />

      <header className={styles.header} role="banner">
        <div className={styles.brandBar}>
          <button
            ref={toggleRef}
            className={styles.menuToggle}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label="Toggle navigation menu"
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <span className={styles.toggleBar} />
            <span className={styles.toggleBar} />
            <span className={styles.toggleBar} />
          </button>
          <Link to="/" className={styles.brand} aria-label="DocForum home">
            <Logo size={24} />
            <span>DocForum</span>
          </Link>
        </div>

        <nav className={styles.desktopNav} role="navigation" aria-label="Main">
          {items.map((item) => (
            <RRNavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                styles.navLink + (isActive ? ` ${styles.navLinkActive}` : '')
              }
              end={item.to === '/'}
            >
              {item.messageId ? t(item.messageId, item.label) : item.label}
              {item.badge != null && item.badge > 0 && (
                <span className={styles.badge} aria-label={`${item.label}, ${item.badge} new`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </RRNavLink>
          ))}
          {user && (
            <Flag name="notification_preferences">
              <RRNavLink
                to="/settings/notifications"
                className={({ isActive }) =>
                  styles.navLink + (isActive ? ` ${styles.navLinkActive}` : '')
                }
              >
                Notifications
              </RRNavLink>
            </Flag>
          )}
          {user && (
            <>
              {user.role === 'doctor' && <UnreadBadge />}
              <span className={styles.userChip}>
                {user.email} <span className={styles.roleBadge} data-role={user.role}>{t(`roles.${user.role}`, user.role)}</span>
              </span>
            </>
          )}
        </nav>

        <div className={styles.headerActions}>
          <LanguageSwitcher />
          <RecordSearch />
          {/* In-app inbox (issue #107): unread badge + dropdown, then the
              full list at /notifications. Hidden while signed out. */}
          <NotificationBell />
          <ProfileSwitcher />
          <Button variant="secondary" onClick={logout} loading={logoutMutation.isPending} size="small">
            {logoutMutation.isPending ? t('nav.loggingOut', 'Logging out…') : t('nav.logOut', 'Log out')}
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
        role="navigation"
        aria-label="Mobile navigation"
        aria-modal={drawerOpen}
        aria-hidden={!drawerOpen}
      >
        <div className={styles.drawerHeader}>
          <Logo size={24} />
          <span className={styles.drawerTitle}>DocForum</span>
          <button
            className={styles.drawerClose}
            aria-label="Close navigation menu"
            onClick={closeDrawer}
          >
            ✕
          </button>
        </div>
        {user ? (
          <>
            <nav className={styles.drawerNav}>
              {items.map((item) => (
                <RRNavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    styles.drawerLink +
                    (isActive ? ` ${styles.drawerLinkActive}` : '')
                  }
                  end={item.to === '/'}
                  onClick={closeDrawer}
                >
                  {item.messageId ? t(item.messageId, item.label) : item.label}
                </RRNavLink>
              ))}
              <Flag name="notification_preferences">
                <RRNavLink
                  to="/settings/notifications"
                  className={({ isActive }) =>
                    styles.drawerLink +
                    (isActive ? ` ${styles.drawerLinkActive}` : '')
                  }
                  onClick={closeDrawer}
                >
                  Notifications
                </RRNavLink>
              </Flag>
            </nav>
            <div className={styles.drawerUser}>
              <span className={styles.drawerEmail}>{user.email}</span>
              <span className={styles.roleBadge} data-role={user.role}>{user.role}</span>
              <Button variant="secondary" onClick={logout} loading={logoutMutation.isPending} fullWidth>
                {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <nav className={styles.drawerNav}>
              {items.map((item) => (
                <RRNavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    styles.drawerLink +
                    (isActive ? ` ${styles.drawerLinkActive}` : '')
                  }
                  end={item.to === '/'}
                  onClick={closeDrawer}
                >
                  {item.messageId ? t(item.messageId, item.label) : item.label}
                </RRNavLink>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Overlay behind the drawer when open */}
      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={closeDrawer} aria-hidden="true" />
      )}

      <main
        ref={mainRef}
        className={styles.main}
        id="main-content"
        role="main"
        tabIndex={-1}
      >
        <PageHeader title={routeTitle(location.pathname)} />
        <ErrorBoundary key={location.pathname} level="route">
          <Outlet context={{}} />
        </ErrorBoundary>
      </main>

      <footer className={styles.footer} role="contentinfo">
        <span>{t('app.footer', 'DocForum — care continuity, escrow-secured fulfillment.')}</span>
        <Link to="/accessibility" className={styles.navLink}>
          {t('app.accessibility', 'Accessibility')}
        </Link>
        <a href="/privacy" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Privacy &amp; analytics</a>
      </footer>
    </div>
  );
}
