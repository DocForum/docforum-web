import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildBreadcrumbs, type Breadcrumb } from '../navigation/breadcrumbs';
import { useT } from '../i18n/useT';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  /** Page title shown as an <h1>. */
  title: string;
  /** Optional breadcrumb trail. If omitted, a trail is derived from the route. */
  breadcrumbs?: Breadcrumb[];
  /** Optional action content (buttons, etc.) aligned right. */
  actions?: React.ReactNode;
  /** Heading level override (default h1). */
  as?: 'h1' | 'h2';
}

/**
 * Page header: title, breadcrumb trail, and actions.
 *
 * Breadcrumbs are derived from the current route when not supplied, so pages
 * can simply pass a title. Landmark / heading structure is kept consistent so
 * screen-reader users can jump past chrome to the page content.
 */
export function PageHeader({ title, breadcrumbs: explicitCrumbs, actions, as: As = 'h1' }: PageHeaderProps) {
  const t = useT();
  const location = useLocation();
  const t = useT();

  // Only routes in the metadata table get a linked crumb, so a breadcrumb
  // never points at a path with no route. The current crumb is the page's
  // own title, never a raw URL segment (`apt-1`).
  const breadcrumbs = useMemo<Breadcrumb[]>(() => {
    if (explicitCrumbs) return explicitCrumbs;
    return buildBreadcrumbs(location.pathname, title);
  }, [location.pathname, explicitCrumbs, title]);

  const crumbLabel = (crumb: Breadcrumb) =>
    crumb.messageId ? t(crumb.messageId, crumb.label) : crumb.label;

  const CrumbElement = As === 'h2' ? 'h2' : 'h1';

  return (
    <header className={styles.pageHeader}>
      <div className={styles.wrapper}>
        {breadcrumbs.length > 0 && (
          <nav className={styles.breadcrumbs} aria-label={t('breadcrumb.aria', 'Breadcrumb')}>
            <ol className={styles.crumbList}>
              {breadcrumbs.map((crumb, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <li key={crumb.to ?? crumb.label + i} className={styles.crumbItem}>
                    {crumb.to && !last ? (
                      <Link to={crumb.to} className={styles.crumbLink}>
                        {crumbLabel(crumb)}
                      </Link>
                    ) : (
                      <span
                        className={styles.crumbCurrent}
                        aria-current={last ? 'page' : undefined}
                      >
                        {crumbLabel(crumb)}
                      </span>
                    )}
                    {!last && <span className={styles.crumbSeparator}>/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <div className={styles.titleArea}>
          <CrumbElement className={styles.title} id="page-title">
            {title}
          </CrumbElement>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}

function breadcrumbLabel(segment: string, segments: string[], t: ReturnType<typeof useT>): string {
  if (segment === 'patient' || segment === 'admin' || segment === 'doctor' || segment === 'facility') {
    return t(`roles.${segment}`, segment.charAt(0).toUpperCase() + segment.slice(1));
  }
  if (segments[0] === 'patient' && segment === 'orders') {
    return t('orders.list.breadcrumb', 'Orders');
  }
  if (segments[0] === 'payments' && segment === 'payments') {
    return t('payments.history.eyebrow', 'Payments');
  }
  if (segments[0] === 'admin') {
    if (segment === 'audit') return t('admin.nav.audit', 'Audit trail');
    if (segment === 'disputes') return t('admin.nav.disputes', 'Disputes');
    if (segment === 'flags') return t('admin.nav.flags', 'Flags');
  }
  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Id\b/g, 'ID')
    .replace(/Url\b/g, 'URL');
}
