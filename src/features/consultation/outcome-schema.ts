import { z } from 'zod';

/**
 * Validation for the consultation outcome panel (issue #286).
 *
 * The shape is flat because every field stays mounted in the form; the
 * conditional rules below only apply to the fields the selected outcome or
 * order type actually uses. Referrals carry one or more targets (the real
 * `POST /consultations/:id/referrals` contract), each with its own optional
 * doctor and required snapshot notes.
 */
export const consultationOutcomeSchema = z
  .object({
    outcome: z.enum(['resolved', 'referred', 'follow_up_needed']),
    followUpDays: z.string(),
    targets: z.array(
      z.object({
        targetSpecialtyId: z.string(),
        targetDoctorId: z.string(),
        snapshotNotes: z.string(),
      }),
    ),
    wantsOrder: z.boolean(),
    orderType: z.enum(['prescription', 'lab_order']),
    medication: z.string(),
    dose: z.string(),
    testName: z.string(),
    orderInstructions: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.outcome === 'referred') {
      if (data.targets.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['targets'],
          message: 'Add at least one referral target.',
        });
      }

      data.targets.forEach((target, index) => {
        if (!target.targetSpecialtyId && !target.targetDoctorId) {
          ctx.addIssue({
            code: 'custom',
            path: ['targets', index, 'targetSpecialtyId'],
            message: 'Target specialty is required.',
          });
        }
        if (!target.snapshotNotes.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['targets', index, 'snapshotNotes'],
            message: 'Snapshot notes are required.',
          });
        }
      });

      const keys = data.targets.map((target) =>
        target.targetDoctorId
          ? `doctor:${target.targetDoctorId}`
          : `specialty:${target.targetSpecialtyId}`,
      );
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['targets'],
          message: 'Remove duplicate referral targets.',
        });
      }
    }

    if (data.outcome === 'follow_up_needed') {
      const days = Number(data.followUpDays.trim());
      if (!Number.isInteger(days) || days < 1 || days > 90) {
        ctx.addIssue({
          code: 'custom',
          path: ['followUpDays'],
          message: 'Enter a whole number of days between 1 and 90.',
        });
      }
    }

    if (data.wantsOrder) {
      if (data.orderType === 'prescription') {
        if (!data.medication.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['medication'],
            message: 'Medication is required.',
          });
        }
        if (!data.dose.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['dose'],
            message: 'Dose is required.',
          });
        }
      } else if (!data.testName.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['testName'],
          message: 'Test name is required.',
        });
      }
    }
  });

export type ConsultationOutcomeFormData = z.infer<typeof consultationOutcomeSchema>;

export const consultationOutcomeDefaults: ConsultationOutcomeFormData = {
  outcome: 'resolved',
  followUpDays: '7',
  targets: [{ targetSpecialtyId: '', targetDoctorId: '', snapshotNotes: '' }],
  wantsOrder: false,
  orderType: 'prescription',
  medication: '',
  dose: '',
  testName: '',
  orderInstructions: '',
};
