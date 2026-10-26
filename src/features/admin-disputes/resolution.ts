import { formatStroops } from '../../services/payments-service';
import type { DisputeResolution, FulfillmentDispute } from '../../types/models';

export const NOTES_MIN_LENGTH = 10;
export const NOTES_MAX_LENGTH = 500;

export function normaliseNotes(notes: string): string {
  return notes.trim().replace(/\s+/g, ' ');
}

export function validateNotes(notes: string): string | null {
  const normalised = normaliseNotes(notes);
  if (normalised.length < NOTES_MIN_LENGTH) {
    return `Add at least ${NOTES_MIN_LENGTH} characters explaining the decision — this is the only record of why.`;
  }
  if (normalised.length > NOTES_MAX_LENGTH) {
    return `Keep notes under ${NOTES_MAX_LENGTH} characters.`;
  }
  return null;
}

export interface ResolutionConsequence {
  /** What happens to the money, in one sentence. */
  payment: string;
  /** What happens to the parties/order. */
  outcome: string;
  /** The exact amount moved, e.g. "50 XLM"; null when no money moves. */
  amountLabel: string | null;
  /** Whether the admin should be told the escrow is untouched/already settled. */
  movesMoney: boolean;
}

/**
 * The consequence shown *before* an admin confirms a final resolution. It is
 * derived from the disputed payment's current status: an escrow that is still
 * held moves on resolution, while one already settled (e.g. a release that
 * was processed before the dispute was raised) must not be described as
 * moving again.
 */
export function resolutionConsequence(
  dispute: Pick<FulfillmentDispute, 'amountStroops' | 'asset' | 'facility' | 'patientName' | 'payment'>,
  resolution: DisputeResolution,
): ResolutionConsequence {
  const amountLabel = formatStroops(dispute.amountStroops, dispute.asset);

  if (dispute.payment.status !== 'escrowed') {
    const settled =
      dispute.payment.status === 'released'
        ? 'already released to the facility'
        : dispute.payment.status === 'refunded'
          ? 'already refunded to the patient'
          : 'not held in escrow';
    return {
      payment: `No money moves: this payment was ${settled}. Resolving only closes the dispute.`,
      outcome:
        resolution === 'facility'
          ? `The dispute is recorded in ${dispute.facility.name}'s favour.`
          : `The dispute is recorded in ${dispute.patientName}'s favour.`,
      amountLabel: null,
      movesMoney: false,
    };
  }

  if (resolution === 'facility') {
    return {
      payment: `Release ${amountLabel} from escrow to ${dispute.facility.name}.`,
      outcome: `${dispute.patientName} is not refunded, and the order stays fulfilled.`,
      amountLabel,
      movesMoney: true,
    };
  }

  return {
    payment: `Refund ${amountLabel} from escrow to ${dispute.patientName}.`,
    outcome: `${dispute.facility.name} is not paid for this order.`,
    amountLabel,
    movesMoney: true,
  };
}

export function resolutionLabel(resolution: DisputeResolution): string {
  return resolution === 'facility' ? 'facility' : 'patient';
}

export function resolutionTitle(resolution: DisputeResolution): string {
  return resolution === 'facility' ? 'Resolve for facility' : 'Resolve for patient';
}
