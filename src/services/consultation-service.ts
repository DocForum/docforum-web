import { apiFetch } from './api-client';
import type {
  ConsultationNote,
  AddAddendumInput,
  ConsultationAddendum,
  ConsultationRecord,
  RecordConsultationInput,
  ConsultationReferral,
  CreateConsultationReferralInput,
  ConsultationIssuedOrder,
  ConsultationOrderInput,
} from '../types/models';

export function getConsultationNote(
  appointmentId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<ConsultationNote> {
  return apiFetch<ConsultationNote>(`/consultation-notes/${appointmentId}`, { accessToken, signal });
}

export function signOffNote(noteId: string, accessToken: string): Promise<ConsultationNote> {
  return apiFetch<ConsultationNote>(`/consultation-notes/${noteId}/sign-off`, { method: 'POST', accessToken });
}

export function addAddendum(noteId: string, input: AddAddendumInput, accessToken: string): Promise<ConsultationAddendum> {
  return apiFetch<ConsultationAddendum>(`/consultation-notes/${noteId}/addenda`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function recordConsultation(
  appointmentId: string,
  input: RecordConsultationInput,
  accessToken: string,
): Promise<ConsultationRecord> {
  return apiFetch<ConsultationRecord>(`/appointments/${appointmentId}/consultation`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function createConsultationReferral(
  consultationId: string,
  input: CreateConsultationReferralInput,
  accessToken: string,
): Promise<ConsultationReferral> {
  return apiFetch<ConsultationReferral>(`/consultations/${consultationId}/referrals`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function issueConsultationOrder(
  consultationId: string,
  input: ConsultationOrderInput,
  accessToken: string,
): Promise<ConsultationIssuedOrder> {
  return apiFetch<ConsultationIssuedOrder>(`/consultations/${consultationId}/orders`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
