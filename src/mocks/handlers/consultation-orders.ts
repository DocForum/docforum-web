// Order issuance mock (issue #267) — mirrors docforum-core's REAL endpoints:
//   GET  /doctors/me
//   GET  /facilities/eligible?type=
//   POST /orders/consultations
//   POST /orders/consultations/:consultationId/prescriptions
//   POST /orders/consultations/:consultationId/lab-orders
// Gated exactly like core: doctor-only, verified profile, append-only orders,
// exactly one of amountStroops / catalogItemCode, and a facility of the right
// type for the order kind.
import { HttpResponse, http } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
import type {
  Consultation,
  ConsultationOutcome,
  IssuedLabOrder,
  IssuedPrescription,
  OrderPricingInput,
  PaymentIntent,
  PrescriptionItemInput,
} from '../../types/models';

/** Fake catalog prices, so `catalogItemCode` is exercisable without a backend. */
const CATALOG_PRICES: Record<string, string> = {
  'amox-500-cap': '15000000', // 1.5 XLM
  'cbc-panel': '25000000', // 2.5 XLM
};

const OUTCOMES: ConsultationOutcome[] = ['resolved', 'referred', 'follow_up_needed'];

function now(): string {
  return new Date().toISOString();
}

function makeIntent(
  kind: 'prescription' | 'lab_order',
  orderId: string,
  patientProfileId: string,
  facilityId: string,
  amountStroops: string,
): PaymentIntent {
  const timestamp = now();
  return {
    id: `pi-${kind}-${orderId}`,
    orderType: kind,
    orderId,
    status: 'created',
    patientProfileId,
    facilityId,
    amountStroops,
    escrowId: null,
    stellarTxHash: null,
    sorobanContractId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

type PricingCheck =
  | { ok: true; amountStroops: string }
  | { ok: false; response: Response };

function resolveAmount(pricing: OrderPricingInput): PricingCheck {
  const hasManual = pricing.amountStroops !== undefined;
  const hasCatalog = pricing.catalogItemCode !== undefined;
  if (hasManual === hasCatalog) {
    return {
      ok: false,
      response: badRequest(
        'Provide exactly one of amountStroops (manual price) or catalogItemCode (facility price list).',
      ),
    };
  }
  if (hasCatalog) {
    const code = String(pricing.catalogItemCode);
    const price = CATALOG_PRICES[code];
    if (!price) {
      return {
        ok: false,
        response: HttpResponse.json(
          { code: 'PRICE_ON_REQUEST', message: `No published price for ${code}.` },
          { status: 422 },
        ),
      };
    }
    return { ok: true, amountStroops: price };
  }
  const amount = String(pricing.amountStroops);
  if (!/^[1-9][0-9]*$/.test(amount)) {
    return {
      ok: false,
      response: badRequest('amountStroops must be a positive integer string.'),
    };
  }
  return { ok: true, amountStroops: amount };
}

function requireVerifiedDoctor() {
  if (!db.doctorProfile || db.doctorProfile.verificationStatus !== 'verified') {
    return forbidden('A verified doctor profile is required to issue orders.');
  }
  return null;
}

function facilityForOrder(facilityProfileId: string, type: 'pharmacy' | 'lab') {
  const facility = db.facilities.find((candidate) => candidate.id === facilityProfileId);
  if (!facility) return notFound('facility');
  if (facility.type !== type) {
    return badRequest(`The selected facility must be a ${type === 'lab' ? 'lab' : 'pharmacy'} facility.`);
  }
  return null;
}

const nonEmpty = (value: unknown, max: number) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

/** 403 helper — docforum-core's gate responses carry a `message` too. */
function forbidden(message: string) {
  return HttpResponse.json({ message }, { status: 403 });
}

export const consultationOrderHandlers = [
  http.get(
    '*/doctors/me',
    respond('nullable', () => db.doctorProfile ?? notFound('doctor profile')),
  ),

  http.post(
    '*/orders/consultations',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        appointmentId?: string;
        outcome?: ConsultationOutcome;
        notes?: string | null;
      };

      if (!body.appointmentId) return badRequest('appointmentId is required.');
      const appointment = db.appointments.find((row) => row.id === body.appointmentId);
      if (!appointment) return notFound('appointment');
      if (db.consultations.some((row) => row.appointmentId === body.appointmentId)) {
        return conflict('this appointment already has a consultation');
      }
      if (body.outcome !== undefined && body.outcome !== null && !OUTCOMES.includes(body.outcome)) {
        return badRequest('unknown consultation outcome');
      }
      if (body.notes != null && String(body.notes).length > 20000) {
        return badRequest('notes are limited to 20000 characters');
      }

      const timestamp = now();
      const consultation: Consultation = {
        id: `con-mock-${db.consultations.length + 1}-${Date.now()}`,
        appointmentId: body.appointmentId,
        outcome: body.outcome ?? null,
        notes: body.notes ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.consultations.push(consultation);
      return HttpResponse.json(consultation, { status: 201 });
    }),
  ),

  http.post(
    '*/orders/consultations/:consultationId/prescriptions',
    respond('json', async ({ params, request }) => {
      const blocked = requireVerifiedDoctor();
      if (blocked) return blocked;

      const consultationId = paramId(params, 'consultationId');
      const consultation = db.consultations.find((row) => row.id === consultationId);
      if (!consultation) return notFound('consultation');

      const body = (await request.json().catch(() => ({}))) as {
        facilityProfileId?: string;
        items?: PrescriptionItemInput[];
        amountStroops?: string;
        catalogItemCode?: string;
      };

      if (!body.facilityProfileId) return badRequest('facilityProfileId is required.');
      const facilityProblem = facilityForOrder(body.facilityProfileId, 'pharmacy');
      if (facilityProblem) return facilityProblem;

      if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
        return badRequest('items must contain between 1 and 100 medications.');
      }
      for (const item of body.items) {
        if (
          !nonEmpty(item.drugName, 200) ||
          !nonEmpty(item.dosage, 200) ||
          !nonEmpty(item.frequency, 200) ||
          !nonEmpty(item.duration, 200)
        ) {
          return badRequest('every item needs a drugName, dosage, frequency and duration.');
        }
      }

      const amount = resolveAmount(body);
      if (!amount.ok) return amount.response;

      const appointment = db.appointments.find((row) => row.id === consultation.appointmentId);
      const id = `rx-mock-${db.prescriptions.length + 1}-${Date.now()}`;
      const prescription: IssuedPrescription = {
        id,
        consultationId,
        patientProfileId: appointment?.patientProfileId ?? 'prf-patient-demo',
        prescribingDoctorId: db.doctorProfile!.id,
        facilityProfileId: body.facilityProfileId,
        amountStroops: amount.amountStroops,
        status: 'issued',
        supersedesPrescriptionId: null,
        createdAt: now(),
        items: body.items.map((item, index) => ({
          id: `rxi-${index + 1}-${id}`,
          prescriptionId: id,
          drugName: item.drugName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
        })),
        paymentIntent: makeIntent(
          'prescription',
          id,
          appointment?.patientProfileId ?? 'prf-patient-demo',
          body.facilityProfileId,
          amount.amountStroops,
        ),
      };
      db.prescriptions.push(prescription);
      db.paymentIntents.push(prescription.paymentIntent);
      return HttpResponse.json(prescription, { status: 201 });
    }),
  ),

  http.post(
    '*/orders/consultations/:consultationId/lab-orders',
    respond('json', async ({ params, request }) => {
      const blocked = requireVerifiedDoctor();
      if (blocked) return blocked;

      const consultationId = paramId(params, 'consultationId');
      const consultation = db.consultations.find((row) => row.id === consultationId);
      if (!consultation) return notFound('consultation');

      const body = (await request.json().catch(() => ({}))) as {
        facilityProfileId?: string;
        testType?: string;
        urgency?: 'routine' | 'urgent';
        notes?: string;
        amountStroops?: string;
        catalogItemCode?: string;
      };

      if (!body.facilityProfileId) return badRequest('facilityProfileId is required.');
      const facilityProblem = facilityForOrder(body.facilityProfileId, 'lab');
      if (facilityProblem) return facilityProblem;

      if (!nonEmpty(body.testType, 200)) return badRequest('testType is required.');
      if (body.urgency && !['routine', 'urgent'].includes(body.urgency)) {
        return badRequest('urgency must be routine or urgent.');
      }
      if (body.notes != null && String(body.notes).length > 20000) {
        return badRequest('notes are limited to 20000 characters.');
      }

      const amount = resolveAmount(body);
      if (!amount.ok) return amount.response;

      const appointment = db.appointments.find((row) => row.id === consultation.appointmentId);
      const id = `lab-mock-${db.labOrders.length + 1}-${Date.now()}`;
      const labOrder: IssuedLabOrder = {
        id,
        consultationId,
        patientProfileId: appointment?.patientProfileId ?? 'prf-patient-demo',
        orderingDoctorId: db.doctorProfile!.id,
        facilityProfileId: body.facilityProfileId,
        amountStroops: amount.amountStroops,
        testType: body.testType!.trim(),
        urgency: body.urgency ?? 'routine',
        notes: body.notes ?? null,
        status: 'issued',
        supersedesLabOrderId: null,
        createdAt: now(),
        expiresAt: null,
        paymentIntent: makeIntent(
          'lab_order',
          id,
          appointment?.patientProfileId ?? 'prf-patient-demo',
          body.facilityProfileId,
          amount.amountStroops,
        ),
      };
      db.labOrders.push(labOrder);
      db.paymentIntents.push(labOrder.paymentIntent);
      return HttpResponse.json(labOrder, { status: 201 });
    }),
  ),
];
