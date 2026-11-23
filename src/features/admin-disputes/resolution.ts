import { formatStroops } from '../../services/payments-service';
import type { DisputeResolution, FulfillmentDispute } from '../../types/models';
import type { Translator } from '../../i18n/useT';
import { englishTranslator } from '../../i18n/englishTranslator';

export const NOTES_MIN_LENGTH = 10;
export const NOTES_MAX_LENGTH = 500;

export function normaliseNotes(notes: string): string {
  return notes.trim().replace(/\s+/g, ' ');
}

export function validateNotes(notes: string, t: Translator = englishTranslator): string | null {
  const normalised = normaliseNotes(notes);
  if (normalised.length < NOTES_MIN_LENGTH) {
    return t('adminDisputes.resolution.notesMin', 'Add at least {min} characters explaining the decision — this is the only record of why.', { min: NOTES_MIN_LENGTH });
  }
  if (normalised.length > NOTES_MAX_LENGTH) {
    return t('adminDisputes.resolution.notesMax', 'Keep notes under {max} characters.', { max: NOTES_MAX_LENGTH });
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
  t: Translator = englishTranslator,
): ResolutionConsequence {
  const amountLabel = formatStroops(dispute.amountStroops, dispute.asset);

  if (dispute.payment.status !== 'escrowed') {
    const settled =
      dispute.payment.status === 'released'
        ? t('adminDisputes.resolution.alreadyReleased', 'already released to the facility')
        : dispute.payment.status === 'refunded'
          ? t('adminDisputes.resolution.alreadyRefunded', 'already refunded to the patient')
          : t('adminDisputes.resolution.notHeld', 'not held in escrow');
    return {
      payment: t('adminDisputes.resolution.noMoneyMoves', 'No money moves: this payment was {settled}. Resolving only closes the dispute.', { settled }),
      outcome: resolution === 'facility'
        ? t('adminDisputes.resolution.recordedFacility', 'The dispute is recorded in {name}’s favour.', { name: dispute.facility.name })
        : t('adminDisputes.resolution.recordedPatient', 'The dispute is recorded in {name}’s favour.', { name: dispute.patientName }),
      amountLabel: null,
      movesMoney: false,
    };
  }

  if (resolution === 'facility') {
    return {
      payment: t('adminDisputes.resolution.release', 'Release {amount} from escrow to {facility}.', { amount: amountLabel, facility: dispute.facility.name }),
      outcome: t('adminDisputes.resolution.releaseOutcome', '{patient} is not refunded, and the order stays fulfilled.', { patient: dispute.patientName }),
      amountLabel,
      movesMoney: true,
    };
  }

  return {
    payment: t('adminDisputes.resolution.refund', 'Refund {amount} from escrow to {patient}.', { amount: amountLabel, patient: dispute.patientName }),
    outcome: t('adminDisputes.resolution.refundOutcome', '{facility} is not paid for this order.', { facility: dispute.facility.name }),
    amountLabel,
    movesMoney: true,
  };
}

export function resolutionLabel(resolution: DisputeResolution, t: Translator = englishTranslator): string {
  return resolution === 'facility' ? t('adminDisputes.party.facility', 'facility') : t('adminDisputes.party.patient', 'patient');
}

export function resolutionTitle(resolution: DisputeResolution, t: Translator = englishTranslator): string {
  return resolution === 'facility'
    ? t('adminDisputes.resolution.titleFacility', 'Resolve for facility')
    : t('adminDisputes.resolution.titlePatient', 'Resolve for patient');
}
