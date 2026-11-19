import { formatStroops } from '../../services/payments-service';
import { identityTranslate } from '../../i18n/useT';
import type { Translate } from '../../i18n/useT';
import type { DisputeResolution, FulfillmentDispute } from '../../types/models';

export const NOTES_MIN_LENGTH = 10;
export const NOTES_MAX_LENGTH = 500;

export function normaliseNotes(notes: string): string {
  return notes.trim().replace(/\s+/g, ' ');
}

export function validateNotes(notes: string, t: Translate = identityTranslate): string | null {
  const normalised = normaliseNotes(notes);
  if (normalised.length < NOTES_MIN_LENGTH) {
    return t(
      'admin.disputes.notesTooShort',
      'Add at least {min} characters explaining the decision — this is the only record of why.',
      { min: NOTES_MIN_LENGTH },
    );
  }
  if (normalised.length > NOTES_MAX_LENGTH) {
    return t('admin.disputes.notesTooLong', 'Keep notes under {max} characters.', {
      max: NOTES_MAX_LENGTH,
    });
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
  t: Translate = identityTranslate,
): ResolutionConsequence {
  const amountLabel = formatStroops(dispute.amountStroops, dispute.asset);

  if (dispute.payment.status !== 'escrowed') {
    const settled =
      dispute.payment.status === 'released'
        ? t('admin.disputes.settled.released', 'already released to the facility')
        : dispute.payment.status === 'refunded'
          ? t('admin.disputes.settled.refunded', 'already refunded to the patient')
          : t('admin.disputes.settled.notHeld', 'not held in escrow');
    return {
      payment: t(
        'admin.disputes.consequence.noMoneyMoves',
        'No money moves: this payment was {settled}. Resolving only closes the dispute.',
        { settled },
      ),
      outcome:
        resolution === 'facility'
          ? t(
              'admin.disputes.consequence.recordedForFacility',
              "The dispute is recorded in {facility}'s favour.",
              { facility: dispute.facility.name },
            )
          : t(
              'admin.disputes.consequence.recordedForPatient',
              "The dispute is recorded in {patient}'s favour.",
              { patient: dispute.patientName },
            ),
      amountLabel: null,
      movesMoney: false,
    };
  }

  if (resolution === 'facility') {
    return {
      payment: t(
        'admin.disputes.consequence.release',
        'Release {amount} from escrow to {facility}.',
        { amount: amountLabel, facility: dispute.facility.name },
      ),
      outcome: t(
        'admin.disputes.consequence.patientNotRefunded',
        '{patient} is not refunded, and the order stays fulfilled.',
        { patient: dispute.patientName },
      ),
      amountLabel,
      movesMoney: true,
    };
  }

  return {
    payment: t(
      'admin.disputes.consequence.refund',
      'Refund {amount} from escrow to {patient}.',
      { amount: amountLabel, patient: dispute.patientName },
    ),
    outcome: t(
      'admin.disputes.consequence.facilityNotPaid',
      '{facility} is not paid for this order.',
      { facility: dispute.facility.name },
    ),
    amountLabel,
    movesMoney: true,
  };
}

export function resolutionLabel(
  resolution: DisputeResolution,
  t: Translate = identityTranslate,
): string {
  return resolution === 'facility'
    ? t('admin.disputes.party.facility', 'facility')
    : t('admin.disputes.party.patient', 'patient');
}

export function resolutionTitle(
  resolution: DisputeResolution,
  t: Translate = identityTranslate,
): string {
  return resolution === 'facility'
    ? t('admin.disputes.resolutionTitle.facility', 'Resolve for facility')
    : t('admin.disputes.resolutionTitle.patient', 'Resolve for patient');
}
