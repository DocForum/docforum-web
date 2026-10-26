import { apiFetch } from './api-client';
import type { AccessLog, AuditEvent, CursorPage } from '../types/models';

/**
 * Server-side filters accepted by the admin audit listings. Mirrors
 * `GET /admin/audit-events`'s query exactly — that endpoint answers `400`
 * to any parameter it doesn't know, so nothing else may be sent (the
 * viewer's action filter is applied client-side for that reason).
 */
export interface AuditQuery {
  entityType?: string;
  /** Rejected by the backend unless `entityType` is also set. */
  entityId?: string;
  actorUserId?: string;
  /** ISO-8601 date, inclusive. */
  from?: string;
  /** ISO-8601 date, inclusive. */
  to?: string;
  cursor?: string | null;
  /** 1–200 server-side; the backend defaults to 50. */
  limit?: number;
}

function toSearch(query: AuditQuery): string {
  const params = new URLSearchParams();
  if (query.entityType) params.set('entityType', query.entityType);
  if (query.entityType && query.entityId) params.set('entityId', query.entityId);
  if (query.actorUserId) params.set('actorUserId', query.actorUserId);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function listAuditEvents(
  query: AuditQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<AuditEvent>> {
  return apiFetch<CursorPage<AuditEvent>>(`/admin/audit-events${toSearch(query)}`, { accessToken, signal });
}

/** Assumed contract (docforum-core#45 not landed): same filters and page
 * envelope as audit events. */
export function listAccessLogs(
  query: AuditQuery,
  accessToken: string,
  signal?: AbortSignal,
): Promise<CursorPage<AccessLog>> {
  return apiFetch<CursorPage<AccessLog>>(`/admin/access-logs${toSearch(query)}`, { accessToken, signal });
}
