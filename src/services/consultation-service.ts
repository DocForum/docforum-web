import { apiFetch } from './api-client';
import type {
  AddAddendumInput,
  Consultation,
  ConsultationAddendum,
  ConsultationNote,
  CreateConsultationInput,
} from '../types/models';

/**
 * Closes the visit with a consultation record and returns it — the real
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

export function getConsultationNote(appointmentId: string, accessToken: string): Promise<ConsultationNote> {
  return apiFetch<ConsultationNote>(`/consultation-notes/${appointmentId}`, { accessToken });
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
