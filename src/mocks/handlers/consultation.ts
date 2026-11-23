// Consultation note sign-off and addenda endpoints.
import { http } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import type {
  ConsultationAddendum,
  ConsultationIssuedOrder,
  ConsultationOrderInput,
  ConsultationOutcome,
  ConsultationRecord,
  ConsultationReferral,
  RecordConsultationInput,
} from '../../types/models';

export const consultationHandlers = [
  http.get(
    '*/consultation-notes/:appointmentId',
    respond('json', ({ params }) => {
      const note = db.consultationNotes.find(
        (n) => n.appointmentId === paramId(params, 'appointmentId'),
      );
      if (!note) return notFound('consultation note');
      return note;
    }),
  ),

  http.post(
    '*/consultation-notes/:id/sign-off',
    respond('json', ({ params }) => {
      const note = db.consultationNotes.find((n) => n.id === paramId(params));
      if (!note) return notFound('consultation note');
      if (note.signedAt) return conflict('note is already signed off and immutable');
      note.signedAt = new Date().toISOString();
      note.signedBy = 'Dr. Demo Doctor (fake)';
      note.autoSignOffAt = null;
      return note;
    }),
  ),

  http.post(
    '*/consultation-notes/:id/addenda',
    respond('json', async ({ params, request }) => {
      const note = db.consultationNotes.find((n) => n.id === paramId(params));
      if (!note) return notFound('consultation note');
      const body = (await request.json().catch(() => ({}))) as { content?: string };
      if (!body.content) return conflict('addendum content is required');
      const addendum: ConsultationAddendum = {
        id: `cad-mock-${db.consultationNotes.length + 1}-${Date.now()}`,
        noteId: note.id,
        content: body.content,
        createdAt: new Date().toISOString(),
      };
      note.addenda = [...note.addenda, addendum];
      return addendum;
    }),
  ),

  http.post(
    '*/appointments/:appointmentId/consultation',
    respond('json', async ({ params, request }) => {
      const appointmentId = paramId(params, 'appointmentId');
      if (!db.appointments.some((a) => a.id === appointmentId)) {
        return notFound('appointment');
      }
      const body = (await request.json().catch(() => ({}))) as Partial<RecordConsultationInput>;
      const outcomes: ConsultationOutcome[] = ['resolved', 'referred', 'follow_up_needed'];
      if (!body.notes?.trim()) return conflict('consultation notes are required');
      if (!body.outcome || !outcomes.includes(body.outcome)) {
        return conflict('a valid consultation outcome is required');
      }
      if (body.outcome === 'follow_up_needed') {
        const days = body.followUpAfterDays;
        if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 90) {
          return conflict('follow-up days must be between 1 and 90');
        }
      }
      const record: ConsultationRecord = {
        id: `cons-mock-${db.consultationRecords.length + 1}-${Date.now()}`,
        appointmentId,
        notes: body.notes.trim(),
        outcome: body.outcome,
        followUpAfterDays:
          body.outcome === 'follow_up_needed' ? body.followUpAfterDays ?? null : null,
        recordedAt: new Date().toISOString(),
      };
      db.consultationRecords.push(record);
      return record;
    }),
  ),

  http.post(
    '*/consultations/:id/referrals',
    respond('json', async ({ params, request }) => {
      const consultation = db.consultationRecords.find((c) => c.id === paramId(params));
      if (!consultation) return notFound('consultation');
      const body = (await request.json().catch(() => ({}))) as {
        targetSpecialty?: string;
        reason?: string;
      };
      if (!body.targetSpecialty?.trim()) return conflict('target specialty is required');
      if (!body.reason?.trim()) return conflict('referral reason is required');
      const referral: ConsultationReferral = {
        id: `cref-mock-${db.consultationReferrals.length + 1}-${Date.now()}`,
        consultationId: consultation.id,
        targetSpecialty: body.targetSpecialty.trim(),
        reason: body.reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      db.consultationReferrals.push(referral);
      return referral;
    }),
  ),

  http.post(
    '*/consultations/:id/orders',
    respond('json', async ({ params, request }) => {
      const consultation = db.consultationRecords.find((c) => c.id === paramId(params));
      if (!consultation) return notFound('consultation');
      const body = (await request.json().catch(() => ({}))) as {
        orderType?: ConsultationOrderInput['orderType'];
        medication?: string;
        dose?: string;
        testName?: string;
        instructions?: string | null;
      };
      let medicationOrTest: string;
      if (body.orderType === 'prescription') {
        if (!body.medication?.trim()) return conflict('medication is required');
        if (!body.dose?.trim()) return conflict('dose is required');
        medicationOrTest = body.medication.trim();
      } else if (body.orderType === 'lab_order') {
        if (!body.testName?.trim()) return conflict('test name is required');
        medicationOrTest = body.testName.trim();
      } else {
        return conflict('order type must be prescription or lab_order');
      }
      const order: ConsultationIssuedOrder = {
        id: `cord-mock-${db.consultationOrders.length + 1}-${Date.now()}`,
        consultationId: consultation.id,
        orderType: body.orderType,
        medicationOrTest,
        instructions: body.instructions?.trim() || null,
        issuedAt: new Date().toISOString(),
      };
      db.consultationOrders.push(order);
      return order;
    }),
  ),
];
