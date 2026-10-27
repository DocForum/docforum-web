import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './PageHeader.module.css';

/** One breadcrumb step. */
interface Breadcrumb {
  label: string;
  to?: string;
}

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
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    if (explicitCrumbs) return explicitCrumbs;

    const crumbs: Breadcrumb[] = [{ label: 'Home', to: '/' }];
    const segments = location.pathname.split('/').filter(Boolean);

    // Home root has no further crumbs.
    if (segments.length === 0) return crumbs;

    let path = '';
    for (const segment of segments) {
      path += `/${segment}`;
      // Skip the first segment if it's a role-based dashboard root that maps
      // to a human label already covered by the title.
      const isRoleRoot =
        (segment === 'patient' || segment === 'doctor' || segment === 'facility' || segment === 'admin') &&
        segments.length === 1;
      if (isRoleRoot) {
        crumbs.push({ label: segment.charAt(0).toUpperCase() + segment.slice(1), to: path });
        continue;
      }
      const label =
        segment
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/Id\b/g, 'ID')
          .replace(/Url\b/g, 'URL');
      crumbs.push({ label, to: path });
    }
    return crumbs;
  }, [location.pathname, explicitCrumbs]);

  const CrumbElement = As === 'h2' ? 'h2' : 'h1';

  return (
    <header className={styles.pageHeader}>
      <div className={styles.wrapper}>
        {breadcrumbs.length > 0 && (
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <ol className={styles.crumbList}>
              {breadcrumbs.map((crumb, i) => {
                const last = i === breadcrumbs.length - 1;
                return (
                  <li key={crumb.to ?? crumb.label + i} className={styles.crumbItem}>
                    {crumb.to && !last ? (
                      <Link to={crumb.to} className={styles.crumbLink}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={styles.crumbCurrent}
                        aria-current={last ? 'page' : undefined}
                      >
                        {crumb.label}
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
          <CrumbElement className={styles.title} id={`page-title-${breadcrumbs[breadcrumbs.length - 1]?.label ?? 'page'}`}>
            {title}
          </CrumbElement>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
