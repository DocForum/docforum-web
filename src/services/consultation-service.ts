import type { Schemas } from '@docforum/api-client';
import { api } from './api-client';

export function getConsultationNote(appointmentId: string, accessToken: string): Promise<Schemas['ConsultationNote']> {
  return api.consultation.getNote(appointmentId, { accessToken });
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
