export type FollowUpStatus = 'open' | 'booked' | 'expired';

export interface FollowUpRequest {
  id: string;
  consultationId: string;
  doctorProfileId: string;
  patientProfileId: string;
  notesSnapshot: string | null;
  intakeFormId: string | null;
  windowStart: string;
  windowEnd: string;
  status: FollowUpStatus;
  bookedAppointmentId: string | null;
  createdAt: string;
}

export interface BookFollowUpResult {
  appointment: import('./patient-appointment-view').PatientAppointment;
  followUp: FollowUpRequest;
}
