import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { ApiError } from '../../../services/api-client';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDateTime } from '../../../i18n/time-zone';
import { useT } from '../../../i18n/useT';
import type { Translate } from '../../../i18n/useT';
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
  const date = new Date(value);
  const label = Number.isNaN(date.getTime())
    ? value
    : formatDateTime(date, timeZone, { dateStyle: 'medium', timeStyle: 'medium' });
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
  if (!actorUserId) return <span className={styles.muted}>{t('admin.audit.actor.system', 'System')}</span>;
  return (
    <div className={styles.stack}>
      {actorRole && <span className={styles.rolePill}>{actorRole}</span>}
      <Link
        to={{ search: narrowedSearch(filters, { actor: actorUserId }) }}
        className={styles.idLink}
        title={t('admin.audit.actor.showOnly', "Show only this actor's entries")}
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
        <Link
          to={recordPath}
          className={styles.idLink}
          title={t('admin.audit.entity.open', 'Open this {entityType}', { entityType })}
        >
          {entityId}
        </Link>
      ) : (
        <span className={styles.id}>{entityId}</span>
      )}
      <Link to={{ search: narrowedSearch(filters, { entityType, entityId }) }} className={styles.inlineAction}>
        {t('admin.audit.entity.history', 'Entity history')}
      </Link>
    </div>
  );
}

function nouns(t: Translate): Record<AuditTab, string> {
  return {
    events: t('admin.audit.noun.events', 'audit events'),
    access: t('admin.audit.noun.access', 'access logs'),
  };
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
  t: Translate,
): { message: string; staleCursor: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 400 && isInvalidCursor(error)) {
      return {
        message: t('admin.audit.error.staleCursor', 'This page position is no longer valid.'),
        staleCursor: true,
      };
    }
    if (error.status === 400) {
      return {
        message: t('admin.audit.error.filtersRejected', 'docforum-core rejected these filters: {message}', {
          message: error.message,
        }),
        staleCursor: false,
      };
    }
    if (error.status === 401 || error.status === 403) {
      return {
        message: t(
          'admin.common.adminAccessLost',
          'Your session no longer has admin access. Sign in again with an admin account.',
        ),
        staleCursor: false,
      };
    }
    if (error.status === 404 && tab === 'access') {
      return {
        message: t(
          'admin.audit.error.accessNotServed',
          "docforum-core doesn't serve access logs yet (docforum-core#45). State-change events are available.",
        ),
        staleCursor: false,
      };
    }
  }
  return {
    message: t(
      'admin.audit.error.loadFailed',
      "Couldn't load {noun}. The preview backend may be waking up — try again in a minute.",
      { noun: nouns(t)[tab] },
    ),
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
  const labels = nouns(t);

  if (isLoading) {
    return (
      <Skeleton
        lines={6}
        height="1.75rem"
        label={t('admin.audit.results.loading', 'Loading {noun}', { noun: labels[tab] })}
      />
    );
  }

  if (error) {
    const { message, staleCursor } = describeAuditError(error, tab, t);
    return (
      <InlineError
        title={t('admin.audit.error.title', "This page couldn't be loaded")}
        message={message}
        onRetry={staleCursor ? props.onNewest : props.onRetry}
        retryLabel={
          staleCursor
            ? t('admin.audit.backToNewest', 'Back to newest')
            : t('errors.actions.tryAgain', 'Try again')
        }
      />
    );
  }

  const filteredOut = pageCount - visibleCount;

  return (
    <div className={styles.results} aria-busy={isFetching}>
      <div className={styles.resultsBar}>
        <p className={styles.resultsSummary} aria-live="polite">
          {pageCount === 0
            ? t('admin.audit.results.emptyPage', 'No {noun} on this page', { noun: labels[tab] })
            : filteredOut > 0
              ? t(
                  'admin.audit.results.filtered',
                  '{visible} of {count} {noun} on this page match the action filter',
                  { visible: visibleCount, count: pageCount, noun: labels[tab] },
                )
              : t(
                  'admin.audit.results.pageCount',
                  '{count, plural, one {1 {noun} on this page} other {# {noun} on this page}}',
                  { count: pageCount, noun: labels[tab] },
                )}
          {props.pageNumber !== null &&
            t('admin.audit.results.pageSuffix', ' · page {number}', {
              number: props.pageNumber,
            })}
          {isFetching && t('admin.audit.results.updating', ' · updating…')}
        </p>
        <Button
          variant="secondary"
          onClick={props.onExport}
          disabled={visibleCount === 0 || isPlaceholderData}
          title={t(
            'admin.audit.results.exportHint',
            'Downloads only the rows shown on this page',
          )}
        >
          {t('admin.audit.results.export', 'Export page as CSV')}
        </Button>
      </div>

      {visibleCount === 0 ? (
        <EmptyState
          title={props.emptyMessage}
          description={t(
            'admin.audit.results.emptyDescription',
            'Adjust the filters above, or jump back to the newest entries.',
          )}
          action={{
            label: t('admin.audit.backToNewest', 'Back to newest'),
            onClick: props.onNewest,
          }}
        />
      ) : (
        <div className={`${styles.tableWrapper} ${isPlaceholderData ? styles.stale : ''}`}>{props.children}</div>
      )}

      <nav
        className={styles.pager}
        aria-label={t('admin.audit.results.pagerAria', '{noun} pages', { noun: labels[tab] })}
      >
        <Button variant="secondary" onClick={props.onNewer} disabled={!props.hasNewer || isFetching}>
          {t('admin.audit.pager.newer', '← Newer')}
        </Button>
        {props.hasNewer && props.pageNumber === null && (
          <Button variant="secondary" onClick={props.onNewest} disabled={isFetching}>
            {t('admin.audit.pager.newest', 'Newest')}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => nextCursor && props.onOlder(nextCursor)}
          disabled={!nextCursor || isFetching}
        >
          {t('admin.audit.pager.older', 'Older →')}
        </Button>
      </nav>
    </div>
  );
}
