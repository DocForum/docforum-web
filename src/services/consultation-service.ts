import type { Schemas } from '@docforum/api-client';
import { api, apiFetch } from './api-client';
import type {
  Consultation,
  CreateConsultationInput,
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
): Promise<Schemas['ConsultationNote']> {
  return api.consultation.getNote(appointmentId, { accessToken, signal });
}

export function signOffNote(noteId: string, accessToken: string): Promise<Schemas['ConsultationNote']> {
  return api.consultation.signOff(noteId, { accessToken });
}

export function addAddendum(
  noteId: string,
  input: Schemas['AddAddendumInput'],
  accessToken: string,
): Promise<Schemas['ConsultationAddendum']> {
  return api.consultation.addAddendum(noteId, input, { accessToken });
}

/**
 * Closes the visit with a consultation record — the real
 * `POST /orders/consultations` (docforum-core's orders flow). Doctor-only and
 * gated on a verified doctor profile; `409` if the appointment already has
 * one, because a consultation is closed once per appointment.
 */
export function createConsultation(
  input: CreateConsultationInput,
  accessToken: string,
): Promise<Consultation> {
  return apiFetch<Consultation>('/orders/consultations', {
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
