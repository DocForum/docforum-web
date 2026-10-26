// Payments endpoints: wallet link and the payment-intent lifecycle.
// Everything goes through docforum-core's API shape — no Stellar calls
// here (hard rule 1). Amounts stay BigInt-as-string.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';
import { FACILITY_ID } from '../fixtures';
import type { PaymentIntent } from '../../types/models';

const TRANSITIONS: Record<string, PaymentIntent['status']> = {
  fund: 'escrowed',
  release: 'released',
  refund: 'refunded',
};

export const paymentsHandlers = [
  http.post(
    '*/payments/wallet-link',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as {
        stellarPublicKey?: string;
      };
      if (!body.stellarPublicKey) {
        return conflict('stellarPublicKey is required');
      }
      const now = new Date().toISOString();
      db.walletLink = {
        id: db.walletLink?.id ?? `wln-mock-${Date.now()}`,
        facilityId: FACILITY_ID,
        stellarPublicKey: body.stellarPublicKey,
        createdAt: db.walletLink?.createdAt ?? now,
        updatedAt: now,
      };
      return db.walletLink;
    }),
  ),

  http.get('*/payments/wallet-link', respond('nullable', () => db.walletLink)),

  http.post(
    '*/payments/intents',
    respond('json', async ({ request }) => {
      const body = (await request.json().catch(() => ({}))) as Partial<PaymentIntent>;
      const now = new Date().toISOString();
      const intent: PaymentIntent = {
        id: `pin-mock-${Date.now()}`,
        orderType: body.orderType ?? 'prescription',
        orderId: body.orderId ?? `ord-mock-${Date.now()}`,
        status: 'created',
        patientProfileId: body.patientProfileId ?? 'prf-patient-demo',
        facilityId: body.facilityId ?? FACILITY_ID,
        amountStroops: body.amountStroops ?? '100000000',
        escrowId: null,
        stellarTxHash: null,
        sorobanContractId: null,
        createdAt: now,
        updatedAt: now,
      };
      db.paymentIntents.unshift(intent);
      return intent;
    }),
  ),

  // Order → intent lookup for the patient payment panel (issues #59/#61).
  // No intent for the order is a 404 — both the status panel and the
  // pay-with-wallet panel hide (the service maps it to null). One handler
  // serves both. ASSUMED: docforum-core#85 (real FKs) hasn't landed.
  http.get(
    '*/payments/intents',
    respond('nullable', ({ request }) => {
      const orderId = new URL(request.url).searchParams.get('orderId');
      if (!orderId) {
        return HttpResponse.json(
          { message: 'Mock API: orderId query parameter is required' },
          { status: 400 },
        );
      }
      return (
        db.paymentIntents.find((i) => i.orderId === orderId) ??
        notFound('payment intent for this order')
      );
    }),
  ),

  http.get(
    '*/payments/intents/:id',
    respond('json', ({ params }) => {
      const intent = db.paymentIntents.find((i) => i.id === paramId(params));
      if (!intent) return notFound('payment intent');
      return intent;
    }),
  ),

  // docforum-core#80 (assumed): prepare the unsigned create_escrow XDR.
  http.post(
    '*/payments/intents/:id/prepare',
    respond('json', ({ params }) => {
      const intent = db.paymentIntents.find((i) => i.id === paramId(params));
      if (!intent) return notFound('payment intent');
      const now = new Date();
      intent.status = 'awaiting_signature';
      intent.updatedAt = now.toISOString();
      return {
        intentId: intent.id,
        xdr: `AAAA${btoa(`mock-unsigned-create_escrow:${intent.id}`)}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`,
        expiresAt: new Date(now.getTime() + 5 * 60_000).toISOString(),
        expiryLedger: 987_654,
        status: intent.status,
      };
    }),
  ),

  // docforum-core#81 (assumed): verify + fee-bump + submit (all server-side;
  // the browser only relays the signed XDR).
  http.post(
    '*/payments/intents/:id/submit',
    respond('json', async ({ params, request }) => {
      const intent = db.paymentIntents.find((i) => i.id === paramId(params));
      if (!intent) return notFound('payment intent');
      const body = (await request.json().catch(() => ({}))) as { signedXdr?: string };
      if (!body.signedXdr) return conflict('signedXdr is required');
      const now = new Date().toISOString();
      intent.status = 'escrowed';
      intent.escrowId = `esc-mock-${intent.id}`;
      intent.stellarTxHash = `mocktx${Date.now()}`;
      intent.updatedAt = now;
      return intent;
    }),
  ),

  ...(['fund', 'release', 'refund'] as const).map((action) =>
    http.post(
      `*/payments/intents/:id/${action}`,
      respond('json', ({ params }) => {
        const intent = db.paymentIntents.find((i) => i.id === paramId(params));
        if (!intent) return notFound('payment intent');
        if (intent.status !== 'created' && action === 'fund') {
          return conflict(`cannot fund an intent in status "${intent.status}"`);
        }
        if (intent.status !== 'escrowed' && (action === 'release' || action === 'refund')) {
          return conflict(`cannot ${action} an intent in status "${intent.status}"`);
        }
        intent.status = TRANSITIONS[action];
        intent.escrowId = intent.escrowId ?? `esc-mock-${Date.now()} (fake)`;
        intent.stellarTxHash = `txdemo${Date.now().toString().padStart(52, '0')}`;
        intent.sorobanContractId = intent.sorobanContractId ?? 'CD mock contract (fake)';
        intent.updatedAt = new Date().toISOString();
        return intent;
      }),
    ),
  ),
];
