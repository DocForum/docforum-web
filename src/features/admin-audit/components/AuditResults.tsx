import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
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
  const date = new Date(value);
  const label = Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
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
  if (!actorUserId) return <span className={styles.muted}>System</span>;
  return (
    <div className={styles.stack}>
      {actorRole && <span className={styles.rolePill}>{actorRole}</span>}
      <Link
        to={{ search: narrowedSearch(filters, { actor: actorUserId }) }}
        className={styles.idLink}
        title="Show only this actor's entries"
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
  const recordPath = entityRecordPath(entityType, entityId);
  return (
    <div className={styles.stack}>
      <span className={styles.entityType}>{entityType}</span>
      {recordPath ? (
        <Link to={recordPath} className={styles.idLink} title={`Open this ${entityType}`}>
          {entityId}
        </Link>
      ) : (
        <span className={styles.id}>{entityId}</span>
      )}
      <Link to={{ search: narrowedSearch(filters, { entityType, entityId }) }} className={styles.inlineAction}>
        Entity history
      </Link>
    </div>
  );
}

const NOUNS: Record<AuditTab, string> = {
  events: 'audit events',
  access: 'access logs',
};

function isInvalidCursor(error: ApiError): boolean {
  const code = (error.body as { code?: unknown } | undefined)?.code;
  return code === 'INVALID_CURSOR' || error.message.includes('INVALID_CURSOR');
}

/** Turns a failed listing into something an admin can act on. Server
 * messages are only surfaced for 400s, where they describe the filter. */
export function describeAuditError(error: unknown, tab: AuditTab): { message: string; staleCursor: boolean } {
  if (error instanceof ApiError) {
    if (error.status === 400 && isInvalidCursor(error)) {
      return { message: 'This page position is no longer valid.', staleCursor: true };
    }
    if (error.status === 400) {
      return { message: `docforum-core rejected these filters: ${error.message}`, staleCursor: false };
    }
    if (error.status === 401 || error.status === 403) {
      return { message: 'Your session no longer has admin access. Sign in again with an admin account.', staleCursor: false };
    }
    if (error.status === 404 && tab === 'access') {
      return {
        message: "docforum-core doesn't serve access logs yet (docforum-core#45). State-change events are available.",
        staleCursor: false,
      };
    }
  }
  return {
    message: `Couldn't load ${NOUNS[tab]}. The preview backend may be waking up — try again in a minute.`,
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
  const { tab, isLoading, isFetching, isPlaceholderData, error, pageCount, visibleCount, nextCursor } = props;

  if (isLoading) {
    return (
      <div className={styles.status} role="status">
        <Spinner size={20} />
        <span>Loading {NOUNS[tab]}…</span>
      </div>
    );
  }

  if (error) {
    const { message, staleCursor } = describeAuditError(error, tab);
    return (
      <div className={styles.errorBox} role="alert">
        <p>{message}</p>
        {staleCursor ? (
          <Button variant="secondary" onClick={props.onNewest}>
            Back to newest
          </Button>
        ) : (
          <Button variant="secondary" onClick={props.onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  const filteredOut = pageCount - visibleCount;

  return (
    <div className={styles.results} aria-busy={isFetching}>
      <div className={styles.resultsBar}>
        <p className={styles.resultsSummary} aria-live="polite">
          {pageCount === 0
            ? `No ${NOUNS[tab]} on this page`
            : filteredOut > 0
              ? `${visibleCount} of ${pageCount} ${NOUNS[tab]} on this page match the action filter`
              : `${pageCount} ${NOUNS[tab]} on this page`}
          {props.pageNumber !== null && ` · page ${props.pageNumber}`}
          {isFetching && ' · updating…'}
        </p>
        <Button
          variant="secondary"
          onClick={props.onExport}
          disabled={visibleCount === 0 || isPlaceholderData}
          title="Downloads only the rows shown on this page"
        >
          Export page as CSV
        </Button>
      </div>

      {visibleCount === 0 ? (
        <p className={styles.empty}>{props.emptyMessage}</p>
      ) : (
        <div className={`${styles.tableWrapper} ${isPlaceholderData ? styles.stale : ''}`}>{props.children}</div>
      )}

      <nav className={styles.pager} aria-label={`${NOUNS[tab]} pages`}>
        <Button variant="secondary" onClick={props.onNewer} disabled={!props.hasNewer || isFetching}>
          ← Newer
        </Button>
        {props.hasNewer && props.pageNumber === null && (
          <Button variant="secondary" onClick={props.onNewest} disabled={isFetching}>
            Newest
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => nextCursor && props.onOlder(nextCursor)}
          disabled={!nextCursor || isFetching}
        >
          Older →
        </Button>
      </nav>
    </div>
  );
}
