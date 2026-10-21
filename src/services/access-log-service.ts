// 'Who viewed my records' access log. Assumed contract against
// docforum-core#45 (PHI read-access logging), which has not landed — see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions". This repo never reads a
// log from anywhere else (hard rule 1).
import { apiFetch } from './api-client';
import type { AccessLogPage, AccessRecordType } from '../types/models';

export interface AccessLogFilters {
  from?: string;
  to?: string;
  recordType?: AccessRecordType;
  cursor?: string;
}

function toQuery(filters: AccessLogFilters): string {
  const params = new URLSearchParams();
  for (const value of ['from', 'to', 'recordType', 'cursor'] as const) {
    const param = filters[value];
    if (param) params.set(value, param);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function listAccessLog(filters: AccessLogFilters, accessToken: string, signal?: AbortSignal): Promise<AccessLogPage> {
  return apiFetch<AccessLogPage>(`/patients/me/access-log${toQuery(filters)}`, { accessToken, signal });
}
