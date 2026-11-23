// Payments endpoints: wallet link and the payment-intent lifecycle.
// Everything goes through docforum-core's API shape — no Stellar calls
// here (hard rule 1). Amounts stay BigInt-as-string.
import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { badRequest, conflict, notFound, paramId, respond } from '../helpers';
import { FACILITY_ID } from '../fixtures';
import type { FacilityLedgerStatus, PaymentIntent } from '../../types/models';

const TRANSITIONS: Record<string, PaymentIntent['status']> = {
  fund: 'escrowed',
  release: 'released',
  refund: 'refunded',
};

const LEDGER_STATUSES: FacilityLedgerStatus[] = [
  'created',
  'funding',
  'escrowed',
  'released',
  'refunded',
  'failed',
];

function ledgerStatus(intent: PaymentIntent): FacilityLedgerStatus {
  if (intent.status === 'awaiting_signature') return 'funding';
  return intent.status;
}

function addStroops(current: string, value: string): string {
  return (BigInt(current) + BigInt(value)).toString();
}

const LEDGER_QUERY_PARAMS = new Set(['status', 'from', 'to', 'cursor', 'limit']);

export const paymentsHandlers = [
  // Facility payout ledger (issue #271) — the real
  // `GET /payments/facility/ledger`, scoped to the signed-in facility.
  // Server-side status/date filtering, cursor pagination and totals.
  http.get(
    '*/payments/facility/ledger',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      for (const key of url.searchParams.keys()) {
        if (!LEDGER_QUERY_PARAMS.has(key)) {
          return badRequest(`unknown query parameter "${key}"`);
        }
      }

      const status = url.searchParams.get('status');
      if (status && !LEDGER_STATUSES.includes(status as FacilityLedgerStatus)) {
        return badRequest(`unknown status "${status}"`);
      }
      const limit = url.searchParams.has('limit')
        ? Number(url.searchParams.get('limit'))
        : 50;
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return badRequest('limit must be an integer between 1 and 100');
      }

      const from = url.searchParams.get('from');
      const fromIso = from && from.length === 10 ? `${from}T00:00:00.000Z` : from;
      const to = url.searchParams.get('to');
      const toIso = to && to.length === 10 ? `${to}T23:59:59.999Z` : to;

      const filtered = db.paymentIntents
        .filter((intent) => intent.facilityId === FACILITY_ID)
        .filter((intent) => !status || ledgerStatus(intent) === status)
        .filter((intent) => !fromIso || intent.createdAt >= fromIso)
        .filter((intent) => !toIso || intent.createdAt <= toIso)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      const cursor = url.searchParams.get('cursor');
      let start = 0;
      if (cursor) {
        const found = filtered.findIndex((intent) => intent.id === cursor);
        if (found < 0) {
          return HttpResponse.json(
            { message: 'Mock API: invalid cursor', code: 'INVALID_CURSOR' },
            { status: 400 },
          );
        }
        start = found + 1;
      }

      const page = filtered.slice(start, start + limit);
      const nextCursor = filtered[start + limit]?.id ?? null;

      const totals = new Map<
        string,
        { asset: { type: 'native' | 'issued'; code: string }; escrowed: string; released: string; refunded: string }
      >();
      for (const intent of filtered) {
        const code = intent.orderType === 'lab_order' ? 'USDC' : 'XLM';
        const total = totals.get(code) ?? {
          asset: { type: code === 'XLM' ? 'native' : 'issued', code },
          escrowed: '0',
          released: '0',
          refunded: '0',
        };
        const lifecycle = ledgerStatus(intent);
        if (lifecycle === 'escrowed' || lifecycle === 'funding') {
          total.escrowed = addStroops(total.escrowed, intent.amountStroops);
        } else if (lifecycle === 'released') {
          total.released = addStroops(total.released, intent.amountStroops);
        } else if (lifecycle === 'refunded') {
          total.refunded = addStroops(total.refunded, intent.amountStroops);
        }
        totals.set(code, total);
      }

      return {
        items: page.map((intent) => {
          const assetCode = intent.orderType === 'lab_order' ? 'USDC' : 'XLM';
          return {
            id: intent.id,
            orderType: intent.orderType,
            orderId: intent.orderId,
            status: ledgerStatus(intent),
            amount: intent.amountStroops,
            assetCode,
            asset: { type: assetCode === 'XLM' ? 'native' : 'issued', code: assetCode },
            escrowId: intent.escrowId,
            stellarTxHash: intent.stellarTxHash,
            sorobanContractId: intent.sorobanContractId,
            refundAfter: new Date(
              Date.parse(intent.createdAt) + 72 * 60 * 60 * 1000,
            ).toISOString(),
            createdAt: intent.createdAt,
            updatedAt: intent.updatedAt,
          };
        }),
        nextCursor,
        totals: [...totals.values()].sort((a, b) => a.asset.code.localeCompare(b.asset.code)),
      };
    }),
  ),
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

  // Patient payment history (GET /payments/mine) supporting filters: status, from, to, limit, cursor.
  http.get(
    '*/payments/mine',
    respond('json', ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const cursor = url.searchParams.get('cursor');
      const limit = Number(url.searchParams.get('limit')) || 50;

      let filtered = [...db.paymentIntents];
      if (status && status !== 'all') {
        filtered = filtered.filter((i) => i.status === status);
      }
      if (from) {
        filtered = filtered.filter((i) => i.createdAt >= from);
      }
      if (to) {
        const toIso = to.length === 10 ? `${to}T23:59:59.999Z` : to;
        filtered = filtered.filter((i) => i.createdAt <= toIso);
      }

      let startIndex = 0;
      if (cursor) {
        const found = filtered.findIndex((i) => i.id === cursor);
        if (found >= 0) startIndex = found + 1;
      }

      const slice = filtered.slice(startIndex, startIndex + limit);
      const nextItem = filtered[startIndex + limit];
      const nextCursor = nextItem ? nextItem.id : null;

      const intents = slice.map((intent) => ({
        ...intent,
        facilityName: 'Bello Lab',
      }));

      return { intents, nextCursor };
    }),
  ),

  http.get(
    '*/payments/mine/:id',
    respond('json', ({ params }) => {
      const intent = db.paymentIntents.find((i) => i.id === paramId(params));
      if (!intent) return notFound('payment entry');
      return {
        ...intent,
        facilityName: 'Bello Lab',
      };
    }),
  ),

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
