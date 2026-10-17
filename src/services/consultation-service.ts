import { apiFetch } from './api-client';
import type { ConsultationNote, AddAddendumInput, ConsultationAddendum } from '../types/models';

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
