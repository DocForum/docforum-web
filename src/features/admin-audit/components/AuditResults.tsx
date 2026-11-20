import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { ApiError } from '../../../services/api-client';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { useFormatters } from '../../../i18n/formatters';
import { useT, type Translator } from '../../../i18n/useT';
import { entityRecordPath } from '../entity-links';
import { toAuditSearch } from '../filters';
import type { AuditFilters, AuditTab } from '../filters';
import type { Role } from '../../../types/models';
import styles from './AuditLogViewer.module.css';

// One page per request, always. The backend caps `limit` at 200; 50 keeps
// the table scannable and the CSV export small.
export const PAGE_SIZE = 50;

export interface AuditPanelProps {
  filters: AuditFilters;
  pageNumber: number | null;
  onOlder: (cursor: string) => void;
  onNewer: () => void;
  onNewest: () => void;
}

/** Search string that narrows the current view, starting from the newest entry. */
function narrowedSearch(filters: AuditFilters, patch: Partial<AuditFilters>): string {
  return `?${toAuditSearch({ ...filters, ...patch, cursor: null }).toString()}`;
}

export function Timestamp({ value }: { value: string }) {
  const { timeZone } = useTimeZone();
  const { dateTime } = useFormatters();
  const date = new Date(value);
  const label = Number.isNaN(date.getTime()) ? value : dateTime(date, { timeZone, dateStyle: 'medium', timeStyle: 'medium' });
  return (
    <time dateTime={value} title={value} className={styles.time}>
      {label}
    </time>
  );
}

interface ActorCellProps {
  actorUserId: string | null;
  actorRole: Role | null;
  filters: AuditFilters;
}

export function ActorCell({ actorUserId, actorRole, filters }: ActorCellProps) {
  const t = useT();
  if (!actorUserId) return <span className={styles.muted}>{t('adminAudit.system', 'System')}</span>;
  return (
    <div className={styles.stack}>
      {actorRole && <span className={styles.rolePill}>{t(`roles.${actorRole}`, actorRole)}</span>}
      <Link
        to={{ search: narrowedSearch(filters, { actor: actorUserId }) }}
        className={styles.idLink}
        title={t('adminAudit.actorFilterTitle', "Show only this actor's entries")}
      >
        {actorUserId}
      </Link>
    </div>
  );
}

interface EntityCellProps {
  entityType: string;
  entityId: string;
  filters: AuditFilters;
}

export function EntityCell({ entityType, entityId, filters }: EntityCellProps) {
  const t = useT();
  const recordPath = entityRecordPath(entityType, entityId);
  return (
    <div className={styles.stack}>
      <span className={styles.entityType}>{entityType}</span>
      {recordPath ? (
        <Link to={recordPath} className={styles.idLink} title={t('adminAudit.openEntity', 'Open this {entityType}', { entityType })}>
          {entityId}
        </Link>
      ) : (
        <span className={styles.id}>{entityId}</span>
      )}
      <Link to={{ search: narrowedSearch(filters, { entityType, entityId }) }} className={styles.inlineAction}>
        {t('adminAudit.entityHistory', 'Entity history')}
      </Link>
    </div>
  );
}

function isInvalidCursor(error: ApiError): boolean {
  const code = (error.body as { code?: unknown } | undefined)?.code;
  return code === 'INVALID_CURSOR' || error.message.includes('INVALID_CURSOR');
}

/** Turns a failed listing into something an admin can act on. Server
 * messages are only surfaced for 400s, where they describe the filter. */
export function describeAuditError(
  error: unknown,
  tab: AuditTab,
  t: Translator = (_id, defaultMessage) => defaultMessage,
): { message: string; staleCursor: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 400 && isInvalidCursor(error)) {
      return { message: t('adminAudit.error.invalidCursor', 'This page position is no longer valid.'), staleCursor: true };
    }
    if (error.status === 400) {
      return {
        message: t('adminAudit.error.badFilters', 'docforum-core rejected these filters: {reason}', { reason: error.message }),
        staleCursor: false,
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        message: t('adminAudit.error.adminSession', 'Your session no longer has admin access. Sign in again with an admin account.'),
        staleCursor: false,
      };
    }
    if (error.status === 404 && tab === 'access') {
      return {
        message: t('adminAudit.error.accessLogsUnavailable', "docforum-core doesn't serve access logs yet (docforum-core#45). State-change events are available."),
        staleCursor: false,
      };
    }
  }
  const noun = t(`adminAudit.noun.${tab}`, tab === 'events' ? 'audit events' : 'access logs');
  return {
    message: t('adminAudit.error.load', 'Could not load {noun}. The preview backend may be waking up — try again in a minute.', { noun }),
    staleCursor: false,
  };
}

interface AuditResultsProps {
  tab: AuditTab;
  isLoading: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  error: unknown;
  onRetry: () => void;
  /** Rows on the page as returned by the server. */
  pageCount: number;
  /** Rows left after client-side filtering. */
  visibleCount: number;
  nextCursor: string | null;
  pageNumber: number | null;
  hasNewer: boolean;
  onOlder: (cursor: string) => void;
  onNewer: () => void;
  onNewest: () => void;
  onExport: () => void;
  emptyMessage: string;
  children: ReactNode;
}

export function AuditResults(props: AuditResultsProps) {
  const t = useT();
  const { tab, isLoading, isFetching, isPlaceholderData, error, pageCount, visibleCount, nextCursor } = props;
  const noun = t(`adminAudit.noun.${tab}`, tab === 'events' ? 'audit events' : 'access logs');

  if (isLoading) {
    return <Skeleton lines={6} height="1.75rem" label={t('adminAudit.loading', 'Loading {noun}', { noun })} />;
  }

  if (error) {
    const { message, staleCursor } = describeAuditError(error, tab, t);
    return (
      <InlineError
        title={t('adminAudit.error.title', 'This page could not be loaded')}
        message={message}
        onRetry={staleCursor ? props.onNewest : props.onRetry}
        retryLabel={staleCursor ? t('adminAudit.backNewest', 'Back to newest') : t('common.tryAgain', 'Try again')}
      />
    );
  }

  const filteredOut = pageCount - visibleCount;

  return (
    <div className={styles.results} aria-busy={isFetching}>
      <div className={styles.resultsBar}>
        <p className={styles.resultsSummary} aria-live="polite">
          {pageCount === 0
            ? t('adminAudit.results.none', 'No {noun} on this page', { noun })
            : filteredOut > 0
              ? t('adminAudit.results.filtered', '{visible} of {total} {noun} on this page match the action filter', { visible: visibleCount, total: pageCount, noun })
              : t('adminAudit.results.count', '{count} {noun} on this page', { count: pageCount, noun })}
          {props.pageNumber !== null && t('adminAudit.results.page', ' · page {page}', { page: props.pageNumber })}
          {isFetching && t('adminAudit.results.updating', ' · updating…')}
        </p>
        <Button
          variant="secondary"
          onClick={props.onExport}
          disabled={visibleCount === 0 || isPlaceholderData}
          title={t('adminAudit.exportTitle', 'Downloads only the rows shown on this page')}
        >
          {t('adminAudit.export', 'Export page as CSV')}
        </Button>
      </div>

      {visibleCount === 0 ? (
        <EmptyState
          title={props.emptyMessage}
          description={t('adminAudit.emptyDescription', 'Adjust the filters above, or jump back to the newest entries.')}
          action={{ label: t('adminAudit.backNewest', 'Back to newest'), onClick: props.onNewest }}
        />
      ) : (
        <div className={`${styles.tableWrapper} ${isPlaceholderData ? styles.stale : ''}`}>{props.children}</div>
      )}

      <nav className={styles.pager} aria-label={t('adminAudit.pagerLabel', '{noun} pages', { noun })}>
        <Button variant="secondary" onClick={props.onNewer} disabled={!props.hasNewer || isFetching}>
          {t('adminAudit.newer', '← Newer')}
        </Button>
        {props.hasNewer && props.pageNumber === null && (
          <Button variant="secondary" onClick={props.onNewest} disabled={isFetching}>
            {t('adminAudit.newest', 'Newest')}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => nextCursor && props.onOlder(nextCursor)}
          disabled={!nextCursor || isFetching}
        >
          {t('adminAudit.older', 'Older →')}
        </Button>
      </nav>
    </div>
  );
}
