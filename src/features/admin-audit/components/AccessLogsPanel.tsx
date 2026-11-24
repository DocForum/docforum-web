import { useMemo } from 'react';
import { useAccessLogs } from '../hooks/useAuditLog';
import { csvFilename, downloadCsv, toCsv } from '../csv';
import { toAuditQuery } from '../filters';
import { ActorCell, AuditResults, EntityCell, PAGE_SIZE, Timestamp } from './AuditResults';
import type { CsvColumn } from '../csv';
import type { AuditPanelProps } from './AuditResults';
import type { AccessLog } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import styles from './AuditLogViewer.module.css';

export const ACCESS_LOG_CSV_COLUMNS: CsvColumn<AccessLog>[] = [
  { header: 'createdAt', value: (entry) => entry.createdAt },
  { header: 'entityType', value: (entry) => entry.entityType },
  { header: 'entityId', value: (entry) => entry.entityId },
  { header: 'route', value: (entry) => entry.route },
  { header: 'actorUserId', value: (entry) => entry.actorUserId },
  { header: 'actorRole', value: (entry) => entry.actorRole },
  { header: 'id', value: (entry) => entry.id },
];

export function AccessLogsPanel({ filters, pageNumber, onOlder, onNewer, onNewest }: AuditPanelProps) {
  const t = useT();
  const query = useMemo(() => toAuditQuery(filters, PAGE_SIZE), [filters]);
  const { data, error, isLoading, isFetching, isPlaceholderData, refetch } = useAccessLogs(query);
  const rows = data?.items ?? [];

  return (
    <AuditResults
      tab="access"
      isLoading={isLoading}
      isFetching={isFetching}
      isPlaceholderData={isPlaceholderData}
      error={error}
      onRetry={() => void refetch()}
      pageCount={rows.length}
      visibleCount={rows.length}
      nextCursor={data?.nextCursor ?? null}
      pageNumber={pageNumber}
      hasNewer={filters.cursor !== null}
      onOlder={onOlder}
      onNewer={onNewer}
      onNewest={onNewest}
      onExport={() => downloadCsv(csvFilename('docforum-access-logs'), toCsv(ACCESS_LOG_CSV_COLUMNS, rows))}
      emptyMessage={t('adminAudit.access.noMatches', 'No record views match these filters.')}
    >
      <table className={styles.table} aria-label={t('adminAudit.access.tableLabel', 'PHI access logs')}>
        <thead>
          <tr>
            <th scope="col">{t('adminAudit.column.when', 'When')}</th>
            <th scope="col">{t('adminAudit.access.recordViewed', 'Record viewed')}</th>
            <th scope="col">{t('adminAudit.access.route', 'Route')}</th>
            <th scope="col">{t('adminAudit.access.viewedBy', 'Viewed by')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td data-label="When">
                <Timestamp value={entry.createdAt} />
              </td>
              <td data-label="Record viewed">
                <EntityCell entityType={entry.entityType} entityId={entry.entityId} filters={filters} />
              </td>
              <td data-label="Route">
                <code className={styles.action}>{entry.route}</code>
              </td>
              <td data-label="Viewed by">
                <ActorCell actorUserId={entry.actorUserId} actorRole={entry.actorRole} filters={filters} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AuditResults>
  );
}
