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
import { paths } from '../routes/paths';
import { RateLimitNotice } from './RateLimitNotice';
import { RecordSearch } from '../features/search-records/components/RecordSearch';
import { NotificationBell } from '../features/notifications/components/NotificationBell';
import { PageHeader } from './PageHeader';
import { pageTitleForPath } from '../navigation/breadcrumbs';
import { PUBLIC_PAGES } from '../pages/public-routes';
import { Flag } from './Flag';
import { useRealtimeCacheSync } from '../hooks/useRealtimeCacheSync';
import styles from './Layout.module.css';
import type { NavItem } from '../navigation/types';
import { adminNavItems } from '../navigation/admin';
import { doctorNavItems } from '../navigation/doctor';
import { facilityNavItems } from '../navigation/facility';
import { guestNavItems } from '../navigation/guest';
import { patientNavItems } from '../navigation/patient';

/** Roles a user may have. Mirrored from docforum-core's model. */
type Role = 'patient' | 'doctor' | 'facility' | 'admin';

/**
 * Role-aware navigation entries, one file per role in src/navigation/. Items
 * are gated by role so unbuilt or role-inappropriate screens never appear.
 * The active item is resolved by `NavLink`'s `end` matching against the
 * current location.
 */
const NAV_ITEMS: Record<Role, NavItem[]> = {
  patient: patientNavItems,
  doctor: doctorNavItems,
  facility: facilityNavItems,
  admin: adminNavItems,
};

function roleNavItems(userRole: Role | null): NavItem[] {
  if (!userRole) return guestNavItems;
  return NAV_ITEMS[userRole].filter((item) => !item.roles || item.roles.includes(userRole));
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
  // Secondary entries (payments, settings) sit behind a divider so the
  // primary workflow stays on one line at 1280px. The drawer stays flat.
  const primaryItems = items.filter((item) => item.group !== 'secondary');
  const secondaryItems = items.filter((item) => item.group === 'secondary');
  const isPublicContent = PUBLIC_PAGES.some((page) => page.path === location.pathname);
  const pageTitle = useMemo(() => {
    const meta = pageTitleForPath(location.pathname);
    return meta.messageId ? t(meta.messageId, meta.label) : meta.label;
  }, [location.pathname, t]);

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
    logoutMutation.mutate(undefined, { onSuccess: () => navigate(paths.login, { replace: true }) });
    closeDrawer();
  };

  return (
    <div className={styles.shell}>
      {/* Skip to content for keyboard users */}
      <a href="#main-content" className={styles.skipLink}>
        {t('shell.skipLink', 'Skip to content')}
      </a>

      <OfflineBanner />
      {/* Global, non-blocking 429 notice (issue #80). */}
      <RateLimitNotice />

      <header className={styles.header} role="banner">
        <div className={styles.brandBar}>
          <button
            ref={toggleRef}
            className={styles.menuToggle}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            aria-label={t('shell.menuToggle', 'Toggle navigation menu')}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <span className={styles.toggleBar} />
            <span className={styles.toggleBar} />
            <span className={styles.toggleBar} />
          </button>
          <Link to="/" className={styles.brand} aria-label={t('shell.brandAria', 'DocForum home')}>
            <Logo size={24} />
            <span>DocForum</span>
          </Link>
        </div>

        <nav className={styles.desktopNav} role="navigation" aria-label={t('shell.nav.main', 'Main')}>
          {primaryItems.map((item) => (
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
                <span
                  className={styles.badge}
                  aria-label={t('shell.nav.badge', '{label}, {count} new', {
                    label: item.messageId ? t(item.messageId, item.label) : item.label,
                    count: item.badge,
                  })}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </RRNavLink>
          ))}
          {secondaryItems.length > 0 && (
            <span className={styles.navGroupDivider} aria-hidden="true" />
          )}
          {secondaryItems.map((item) => (
            <RRNavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                styles.navLink + (isActive ? ` ${styles.navLinkActive}` : '')
              }
            >
              {item.messageId ? t(item.messageId, item.label) : item.label}
            </RRNavLink>
          ))}
          {user && (
            <Flag name="notification_preferences">
              <RRNavLink
                to={paths.notificationSettings}
                className={({ isActive }) =>
                  styles.navLink + (isActive ? ` ${styles.navLinkActive}` : '')
                }
              >
                {t('shell.nav.notifications', 'Notifications')}
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
          {user && (
            <>
              <ProfileSwitcher />
              <Button variant="secondary" onClick={logout} loading={logoutMutation.isPending} size="small">
                {logoutMutation.isPending ? t('nav.loggingOut', 'Logging out…') : t('nav.logOut', 'Log out')}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        id="mobile-drawer"
        className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
        role="navigation"
        aria-label={t('shell.drawer.aria', 'Mobile navigation')}
        aria-modal={drawerOpen}
        aria-hidden={!drawerOpen}
      >
        <div className={styles.drawerHeader}>
          <Logo size={24} />
          <span className={styles.drawerTitle}>DocForum</span>
          <button
            className={styles.drawerClose}
            aria-label={t('shell.drawer.close', 'Close navigation menu')}
            onClick={closeDrawer}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
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
                  to={paths.notificationSettings}
                  className={({ isActive }) =>
                    styles.drawerLink +
                    (isActive ? ` ${styles.drawerLinkActive}` : '')
                  }
                  onClick={closeDrawer}
                >
                  {t('shell.nav.notifications', 'Notifications')}
                </RRNavLink>
              </Flag>
            </nav>
            <div className={styles.drawerUser}>
              <span className={styles.drawerEmail}>{user.email}</span>
              <span className={styles.roleBadge} data-role={user.role}>{t(`roles.${user.role}`, user.role)}</span>
              <Button variant="secondary" onClick={logout} loading={logoutMutation.isPending} fullWidth>
                {logoutMutation.isPending ? t('nav.loggingOut', 'Logging out…') : t('nav.logOut', 'Log out')}
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
        {/* Public information pages (#120) render their own <header>/<h1>;
            the app shell must not add a second one. */}
        {isPublicContent ? null : <PageHeader title={pageTitle} />}
        <ErrorBoundary key={location.pathname} level="route">
          <Outlet context={{}} />
        </ErrorBoundary>
      </main>

      <footer className={styles.footer} role="contentinfo">
        <span>{t('app.footer', 'DocForum — care continuity, escrow-secured fulfillment.')}</span>
        <Link to={paths.accessibility} className={styles.navLink}>
          {t('app.accessibility', 'Accessibility')}
        </Link>
        {/* Router link, not a raw href: under the GitHub Pages base path a bare
            "/…" href leaves the app. The analytics disclosure moved to
            /privacy/analytics when /privacy became the public privacy page. */}
        <Link to="/privacy/analytics" className={styles.footerMutedLink}>
          {t('shell.footer.privacy', 'Privacy & analytics')}
        </Link>
      </footer>
    </div>
  );
}
