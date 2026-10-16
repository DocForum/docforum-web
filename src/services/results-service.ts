// Lab-results reads from docforum-core — ASSUMED contract, not real yet.
//
// docforum-core's `LabResult` table today only has
// id/resultFileUrl/summary/createdAt (plus TODO labOrderId/
// fulfillingFacilityId), and its lab-orders routes file is still a
// placeholder. The endpoints, flag, and acknowledgement fields below are
// the smallest reasonable guess at what docforum-core issue #72
// ("Abnormal lab result escalation and doctor acknowledgement tracking",
// PRD §8.2.7) will ship — needed to build issue #24's viewer now.
// Reconcile on sight once that backend issue merges; see
// ARCHITECTURE_ESSENTIALS.md "Known assumptions (assumed API contracts)".
//
// This repo never touches result storage directly (hard rule 1 applies to
// clinical files the same way it does to Stellar: everything comes from
// docforum-core's API, including the download URL).
import { apiFetch } from './api-client';
import type { LabResult } from '../types/models';

export function listMyLabResults(accessToken: string): Promise<LabResult[]> {
  return apiFetch<LabResult[]>('/lab-results/mine', { accessToken });
}

export function getLabResult(id: string, accessToken: string): Promise<LabResult> {
  return apiFetch<LabResult>(`/lab-results/${id}`, { accessToken });
}
