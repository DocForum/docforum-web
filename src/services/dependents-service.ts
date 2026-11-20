import { apiFetch } from './api-client';
import type { Dependent, DependentCreateInput, DependentInput } from '../types/models';

export function listDependents(accessToken: string): Promise<Dependent[]> {
  return apiFetch<Dependent[]>('/patients/me/dependents', { accessToken });
}

export function addDependent(input: DependentCreateInput, accessToken: string): Promise<Dependent> {
  // docforum-core's POST is strict: any field beyond these two is a 400.
  const body: DependentCreateInput = { fullName: input.fullName, dateOfBirth: input.dateOfBirth };
  return apiFetch<Dependent>('/patients/me/dependents', { method: 'POST', body, accessToken });
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
