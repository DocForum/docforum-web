// Structured intake submission (issue #36, building on #2's booking flow).
//
// ASSUMED contract — docforum-core#1/#2 do not model structured intake yet.
// The read side already exists in this repo as
// `GET /appointments/:id/intake` (doctor-today-service, docforum-core#129);
// this is the patient-side write for the same resource. Recorded in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions".
//
//   POST /appointments/:appointmentId/intake -> SubmittedIntake
//
// The server answers 409 when the slot expired or was released while the
// patient was typing. The caller must keep the draft in that case — see
// IntakeForm.
import { apiFetch } from './api-client';
import type { SubmitIntakeInput, SubmittedIntake } from '../types/models';

export function submitIntake(
  appointmentId: string,
  input: SubmitIntakeInput,
  accessToken: string,
): Promise<SubmittedIntake> {
  return apiFetch<SubmittedIntake>(`/appointments/${appointmentId}/intake`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
