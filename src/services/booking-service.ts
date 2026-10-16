import { apiRequest } from './api-client';
import type {
  Appointment,
  RedFlagResult,
} from '../types/modelsLiteral';

export interface IntakeSubmissionPayload {
  doctorId: string;
  slotId: string;
  patientProfileId: string;
  /** Free-text symptom description the backend rule set evaluates. */
  symptoms: string;
  /** Optional structured answers the intake form collects. */
  answers?: Record<string, string>;
}

export interface IntakeSubmissionResult {
  /** The booking the intake was attached to. */
  bookingId: string;
  /** Present when the backend's rule set matched red flags. */
  redFlags?: RedFlagResult | null;
}

/**
 * Submit the intake form. The API may respond with `redFlags` in the
 * result body; the caller is responsible for surfacing the interstitial and
 * blocking further booking until the patient acknowledges.
 */
export async function submitIntake(
  payload: IntakeSubmissionPayload,
): Promise<IntakeSubmissionResult> {
  return apiRequest<IntakeSubmissionResult>('/bookings/intake', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Record the patient's explicit acknowledgement of the red flags for a
 * given booking. The backend audits on this call, so the client cannot
 * silently skip the interstitial.
 */
export async function acknowledgeRedFlags(bookingId: string): Promise<void> {
  await apiRequest<void>(`/bookings/${encodeURIComponent(bookingId)}/redflag-acknowledgement`, {
    method: 'POST',
  });
}

export interface CreateBookingPayload {
  doctorId: string;
  slotId: string;
  patientProfileId: string;
}

/**
 * Create the booking itself. Separate from intake submission so the
 * red-flag interstitial can gate before any appointment is created.
 */
export async function createBooking(payload: CreateBookingPayload): Promise<Appointment> {
  return apiRequest<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
