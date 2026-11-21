import { useMemo } from 'react';
import { useAuditEvents } from '../hooks/useAuditLog';
import { csvFilename, downloadCsv, toCsv } from '../csv';
import { matchesAction, toAuditQuery } from '../filters';
import { ActorCell, AuditResults, EntityCell, PAGE_SIZE, Timestamp } from './AuditResults';
import type { CsvColumn } from '../csv';
import type { AuditPanelProps } from './AuditResults';
import type { AuditEvent } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import styles from './AuditLogViewer.module.css';

export const AUDIT_EVENT_CSV_COLUMNS: CsvColumn<AuditEvent>[] = [
  { header: 'createdAt', value: (event) => event.createdAt },
  { header: 'action', value: (event) => event.action },
  { header: 'entityType', value: (event) => event.entityType },
  { header: 'entityId', value: (event) => event.entityId },
  { header: 'fromState', value: (event) => event.fromState },
  { header: 'toState', value: (event) => event.toState },
  { header: 'actorUserId', value: (event) => event.actorUserId },
  { header: 'actorRole', value: (event) => event.actorRole },
  { header: 'requestId', value: (event) => event.requestId },
  { header: 'metadata', value: (event) => (event.metadata ? JSON.stringify(event.metadata) : null) },
  { header: 'id', value: (event) => event.id },
];

function formatMetadataValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function Metadata({ metadata }: { metadata: AuditEvent['metadata'] }) {
  const entries = metadata ? Object.entries(metadata) : [];
  if (entries.length === 0) return null;
  return (
    <dl className={styles.metadata}>
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditEventsPanel({ filters, pageNumber, onOlder, onNewer, onNewest }: AuditPanelProps) {
  const t = useT();
  const query = useMemo(() => toAuditQuery(filters, PAGE_SIZE), [filters]);
  const { data, error, isLoading, isFetching, isPlaceholderData, refetch } = useAuditEvents(query);

  const items = data?.items ?? [];
  const rows = useMemo(() => items.filter((event) => matchesAction(event.action, filters.action)), [items, filters.action]);

  return (
    <>
      {filters.action && (
        <p className={styles.hint}>
          {t('adminAudit.events.actionHint', 'Action is matched within each loaded page — docforum-core’s audit endpoint does not filter by action yet, so older pages may hold more matches.')}
        </p>
      )}
      <AuditResults
        tab="events"
        isLoading={isLoading}
        isFetching={isFetching}
        isPlaceholderData={isPlaceholderData}
        error={error}
        onRetry={() => void refetch()}
        pageCount={items.length}
        visibleCount={rows.length}
        nextCursor={data?.nextCursor ?? null}
        pageNumber={pageNumber}
        hasNewer={filters.cursor !== null}
        onOlder={onOlder}
        onNewer={onNewer}
        onNewest={onNewest}
        onExport={() => downloadCsv(csvFilename('docforum-audit-events'), toCsv(AUDIT_EVENT_CSV_COLUMNS, rows))}
        emptyMessage={
          items.length > 0
            ? t('adminAudit.events.noMatchesPage', 'No events on this page match the action filter. Try older pages.')
            : t('adminAudit.events.noMatches', 'No audit events match these filters.')
        }
      >
        <table className={styles.table} aria-label={t('adminAudit.events.tableLabel', 'State-change audit events')}>
          <thead>
            <tr>
              <th scope="col">{t('adminAudit.column.when', 'When')}</th>
              <th scope="col">{t('adminAudit.column.action', 'Action')}</th>
              <th scope="col">{t('adminAudit.column.entity', 'Entity')}</th>
              <th scope="col">{t('adminAudit.column.transition', 'Transition')}</th>
              <th scope="col">{t('adminAudit.column.actor', 'Actor')}</th>
              <th scope="col">{t('adminAudit.column.requestDetails', 'Request & details')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id}>
                <td data-label="When">
                  <Timestamp value={event.createdAt} />
                </td>
                <td data-label="Action">
                  <code className={styles.action}>{event.action}</code>
                </td>
                <td data-label="Entity">
                  <EntityCell entityType={event.entityType} entityId={event.entityId} filters={filters} />
                </td>
                <td data-label="Transition">
                  {event.fromState || event.toState ? (
                    <span className={styles.transition}>
                      <span>{event.fromState ?? '∅'}</span>
                      <span aria-label={t('adminAudit.transitionTo', 'to')}>→</span>
                      <span>{event.toState ?? '∅'}</span>
                    </span>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td data-label="Actor">
                  <ActorCell actorUserId={event.actorUserId} actorRole={event.actorRole} filters={filters} />
                </td>
                <td data-label="Request &amp; details">
                  {event.requestId && (
                    <span className={styles.id} title={t('adminAudit.requestIdTitle', 'X-Request-Id')}>
                      {event.requestId}
                    </span>
                  )}
                  <Metadata metadata={event.metadata} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AuditResults>
    </>
  );
}
