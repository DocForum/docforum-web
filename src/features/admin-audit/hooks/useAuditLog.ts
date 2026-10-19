import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as auditService from '../../../services/audit-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { AuditQuery } from '../../../services/audit-service';
import type { CursorPage } from '../../../types/models';
import type { AuditTab } from '../filters';

type PageFetcher<T> = (query: AuditQuery, accessToken: string, signal?: AbortSignal) => Promise<CursorPage<T>>;

// A 4xx won't fix itself on retry (bad filter, expired cursor, not an
// admin, endpoint not deployed yet) — only retry network/5xx failures.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

function useAuditPage<T>(tab: AuditTab, fetchPage: PageFetcher<T>, query: AuditQuery) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['admin', 'audit', tab, query],
    queryFn: ({ signal }) => fetchPage(query, accessToken!, signal),
    enabled: Boolean(accessToken),
    // Keep the current page on screen while the next one loads, instead of
    // collapsing the table to a spinner on every page turn.
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function useAuditEvents(query: AuditQuery) {
  return useAuditPage('events', auditService.listAuditEvents, query);
}

export function useAccessLogs(query: AuditQuery) {
  return useAuditPage('access', auditService.listAccessLogs, query);
}
