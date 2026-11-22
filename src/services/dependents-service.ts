import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export type ClaimAccountInput = Schemas['ClaimAccountInput'];

export function listDependents(accessToken: string, signal?: AbortSignal): Promise<Schemas['Dependent'][]> {
  return api.dependents.list({ accessToken, signal });
}

export function addDependent(
  // Core's strict create body takes only these two fields (issue #261): any
  // other field, `relationship` included, is a 400. The generated schema still
  // lists `relationship` as required, so the narrower input is cast here and
  // the mismatch stays documented in docs.d/261-dependents-strict-create.md.
  input: Pick<Schemas['DependentInput'], 'fullName' | 'dateOfBirth'>,
  accessToken: string,
): Promise<Schemas['Dependent']> {
  return api.dependents.add(input as Schemas['DependentInput'], { accessToken });
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

export function claimAccount(input: Schemas['ClaimAccountInput']): Promise<void> {
  return api.auth.claimAccount(input);
}
