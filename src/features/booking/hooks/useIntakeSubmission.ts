import { useMutation } from '@react-query/react';
import {
  acknowledgeRedFlags,
  submitIntake,
  type IntakeSubmissionPayload,
  type IntakeSubmissionResult,
} from '../../../services/booking-service';

export interface UseIntakeSubmissionResult {
  /** Submit the intake form. Resolves with the API result (which may carry redFlags). */
  submitIntake: (payload: IntakeSubmissionPayload) => Promise<IntakeSubmissionResult>;
  /** Record the patient's explicit acknowledgement of the red flags. */
  acknowledge: (bookingId: string) => Promise<void>;
  isSubmitting: boolean;
  isAcknowledging: boolean;
  error: Error | null;
}

/**
 * Wraps the two intake-related mutations behind one hook so the booking
 * flow has a single place to drive submission and the red-flag acknowledgement.
 */
export function useIntakeSubmission(): UseIntakeSubmissionResult {
  const submitMutation = useMutation({
    mutationFn: (payload: IntakeSubmissionPayload) => submitIntake(payload),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (bookingId: string) => acknowledgeRedFlags(bookingId),
  });

  return {
    submitIntake: (payload) => submitMutation.mutateAsync(payload),
    acknowledge: (bookingId) => acknowledgeMutation.mutateAsync(bookingId),
    isSubmitting: submitMutation.isPending,
    isAcknowledging: acknowledgeMutation.isPending,
    error: (submitMutation.error as Error | null) ?? null,
  };
}
