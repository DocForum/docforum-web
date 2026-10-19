import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export function listDependents(accessToken: string): Promise<Schemas['Dependent'][]> {
  return api.dependents.list({ accessToken });
}

export function addDependent(input: Schemas['DependentInput'], accessToken: string): Promise<Schemas['Dependent']> {
  return api.dependents.add(input, { accessToken });
}

export function updateDependent(
  id: string,
  input: Schemas['DependentInput'],
  accessToken: string,
): Promise<Schemas['Dependent']> {
  return api.dependents.update(id, input, { accessToken });
}

export function sendHandoverInvite(
  dependentId: string,
  email: string,
  accessToken: string,
): Promise<Schemas['Dependent']> {
  return api.dependents.sendHandoverInvite(dependentId, { email }, { accessToken });
}

export function resendHandoverInvite(dependentId: string, accessToken: string): Promise<Schemas['Dependent']> {
  return api.dependents.resendHandoverInvite(dependentId, { accessToken });
}

export type ClaimAccountInput = Schemas['ClaimAccountInput'];

export function claimAccount(input: ClaimAccountInput): Promise<void> {
  return api.auth.claimAccount(input);
}
