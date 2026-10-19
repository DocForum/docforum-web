// Patient order fetch (issue #61). ASSUMED contract: docforum-core has no
// Order model yet (its docforum-core#9 and #85 are open) — see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Patient order detail &
// payment panel". Everything still goes through docforum-core's API
// (hard rule 1); reconcile once the real endpoint exists.
import { apiFetch } from './api-client';
import type { PatientOrder } from '../types/models';

export function getPatientOrder(id: string, accessToken: string): Promise<PatientOrder> {
  return apiFetch<PatientOrder>(`/patients/me/orders/${encodeURIComponent(id)}`, {
    accessToken,
  });
}
