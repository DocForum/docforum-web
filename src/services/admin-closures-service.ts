import { apiFetch } from './api-client';
import type { Closure, CreateClosureInput, UpdateClosureInput, AffectedAppointment } from '../types/models';

/** GET /admin/closures - list closures (platform-wide or scoped). */
export function listClosures(accessToken: string, signal?: AbortSignal): Promise<Closure[]> {
  return apiFetch<Closure[]>('/admin/closures', { accessToken, signal });
}

/** POST /admin/closures - create a new closure. */
export function createClosure(input: CreateClosureInput, accessToken: string): Promise<Closure> {
  return apiFetch<Closure>('/admin/closures', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** PATCH /admin/closures/:id - update a closure. */
export function updateClosure(id: string, input: UpdateClosureInput, accessToken: string): Promise<Closure> {
  return apiFetch<Closure>(`/admin/closures/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

/** DELETE /admin/closures/:id - delete a closure. */
export function deleteClosure(id: string, accessToken: string): Promise<void> {
  return apiFetch<void>(`/admin/closures/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    accessToken,
  });
}

/** GET /admin/closures/:id/affected-appointments - get affected booked appointments. */
export function listAffectedAppointments(closureId: string, accessToken: string): Promise<AffectedAppointment[]> {
  return apiFetch<AffectedAppointment[]>(`/admin/closures/${encodeURIComponent(closureId)}/affected-appointments`, { accessToken });
}