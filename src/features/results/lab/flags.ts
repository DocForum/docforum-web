// Flag/status copy for the patient lab results viewer (issue #24). Pure and
// testable without a DOM: every flag state has exactly one sentence, and the
// critical/abnormal states explain what happens next instead of printing
// alarming raw text.
import type {
  LabResultAcknowledgement,
  LabResultFlag,
  LabResultStatus,
} from '../../../types/models';
import { formatInstant } from '../../../i18n/format';

export const FLAG_LABEL: Record<LabResultFlag, string> = {
  normal: 'In the usual range',
  abnormal: 'Outside the usual range',
  critical: 'Needs prompt attention',
};

export const FLAG_EXPLANATION: Record<LabResultFlag, string> = {
  normal: 'Every measured value is inside the reference range for you.',
  abnormal: 'At least one value is outside the usual range. This is common and is not automatically serious.',
  critical:
    'At least one value needs prompt attention. Your doctor has been notified — do not wait for a routine appointment.',
};

export const STATUS_LABEL: Record<LabResultStatus, string> = {
  pending: 'Waiting for the lab',
  held: 'Being reviewed by your doctor',
  available: 'Ready to view',
  reviewed: 'Reviewed by your doctor',
};

/** A held result must not be readable or downloadable before review. */
export function canViewFile(status: LabResultStatus): boolean {
  return status === 'available' || status === 'reviewed';
}

export interface AcknowledgementCopy {
  tone: 'info' | 'warning' | 'critical';
  heading: string;
  body: string;
}

/**
 * What happens next for a flagged result. Returns null for a normal result
 * (there is nothing to escalate). The acknowledgement status comes from the
 * backend; this function never assumes a doctor has been notified.
 */
export function acknowledgementCopy(
  acknowledgement: LabResultAcknowledgement | null | undefined,
  flag: LabResultFlag,
): AcknowledgementCopy | null {
  if (flag === 'normal') return null;
  const nextStep = acknowledgement?.nextStep?.trim();

  if (acknowledgement?.status === 'acknowledged') {
    return {
      tone: flag === 'critical' ? 'warning' : 'info',
      heading: `${acknowledgement.acknowledgedBy ?? 'Your doctor'} has reviewed this result`,
      body:
        nextStep ??
        (acknowledgement.acknowledgedAt
          ? `Reviewed on ${formatInstant(acknowledgement.acknowledgedAt, { year: 'numeric', month: 'short', day: 'numeric' })}. If anything has changed, contact the clinic.`
          : 'If anything has changed, contact the clinic.'),
    };
  }

  return {
    tone: flag === 'critical' ? 'critical' : 'warning',
    heading:
      flag === 'critical'
        ? 'Your doctor has been notified'
        : 'Your doctor will see this result',
    body:
      nextStep ??
      (flag === 'critical'
        ? 'The clinic has been alerted and will contact you. If you feel very unwell, seek urgent care now.'
        : 'Your doctor reviews flagged results and will contact you if anything needs following up.'),
  };
}
