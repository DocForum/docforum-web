import { apiFetch } from './api-client';
import type { Dependent, DependentInput } from '../types/models';

export function listDependents(accessToken: string): Promise<Dependent[]> {
  return apiFetch<Dependent[]>('/patients/me/dependents', { accessToken });
}

export function addDependent(input: DependentInput, accessToken: string): Promise<Dependent> {
  return apiFetch<Dependent>('/patients/me/dependents', { method: 'POST', body: input, accessToken });
}

export function updateDependent(id: string, input: DependentInput, accessToken: string): Promise<Dependent> {
  return apiFetch<Dependent>(`/patients/me/dependents/${id}`, { method: 'PATCH', body: input, accessToken });
}

export function sendHandoverInvite(dependentId: string, email: string, accessToken: string): Promise<Dependent> {
  return apiFetch<Dependent>(`/patients/me/dependents/${dependentId}/handover-invite`, {
    method: 'POST',
    body: { email },
    accessToken,
  });
}

export function resendHandoverInvite(dependentId: string, accessToken: string): Promise<Dependent> {
  return apiFetch<Dependent>(`/patients/me/dependents/${dependentId}/handover-invite/resend`, {
    method: 'POST',
    accessToken,
  });
}

export interface ClaimAccountInput {
  token: string;
  email: string;
  password: string;
}

export function claimAccount(input: ClaimAccountInput): Promise<void> {
  return apiFetch<void>('/auth/claim-account', { method: 'POST', body: input });
}
