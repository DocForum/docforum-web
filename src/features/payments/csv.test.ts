import { describe, expect, it } from 'vitest';
import { paymentHistoryToCsv, csvFilename } from './csv';
import type { PaymentHistoryEntry } from '../../types/models';

function entry(overrides: Partial<PaymentHistoryEntry> = {}): PaymentHistoryEntry {
  return {
    id: 'pi-1',
    orderType: 'prescription',
    orderId: 'ord-1',
    status: 'escrowed',
    patientProfileId: 'pp-1',
    facilityId: 'fac-1',
    amountStroops: '25000000',
    escrowId: '77',
    stellarTxHash: 'abc123hash',
    sorobanContractId: null,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

describe('payment history CSV export', () => {
  it('formats amounts from stroop strings without float conversion', () => {
    const csv = paymentHistoryToCsv([
      entry({ id: 'pi-1', amountStroops: '25000000' }),
    ]);

    expect(csv).toContain('2.5 XLM');
  });

  it('prints amounts larger than 2^53 stroops exactly without IEEE 754 precision loss', () => {
    const csv = paymentHistoryToCsv([
      entry({ id: 'pi-huge', amountStroops: '9007199254740993' }),
    ]);

    expect(csv).toContain('"900,719,925.4740993 XLM"');
  });

  it('neutralises spreadsheet formula prefixes (CSV injection)', () => {
    const csv = paymentHistoryToCsv([
      entry({
        id: '=CMD|calc',
        facilityName: '+Dr. Evil Clinic',
      }),
    ]);

    expect(csv).toContain("'=CMD|calc");
    expect(csv).toContain("'+Dr. Evil Clinic");
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const csv = paymentHistoryToCsv([
      entry({
        facilityName: 'Bello, "Main" Lab\nBranch',
      }),
    ]);

    expect(csv).toContain('"Bello, ""Main"" Lab\nBranch"');
  });

  it('includes Stellar testnet explorer link for funded entries and blank for unfunded', () => {
    const csv = paymentHistoryToCsv([
      entry({ id: 'pi-funded', stellarTxHash: 'beef42' }),
      entry({ id: 'pi-unfunded', stellarTxHash: null, status: 'created' }),
    ]);

    expect(csv).toContain('https://testnet.stellar.expert/explorer/public/transaction/beef42');
    // For unfunded entry, the explorer link cell is blank
    const lines = csv.split('\r\n');
    expect(lines[2]).toMatch(/,$/);
  });

  it('builds RFC 4180-style CRLF lines and headers', () => {
    const csv = paymentHistoryToCsv([]);
    expect(csv).toBe('ID,Date,Type,Facility,Status,Amount,Explorer Link\r\n');
  });

  it('names the file safely with a timestamp and no personal data', () => {
    const filename = csvFilename('docforum-payment-history', new Date('2026-10-18T09:30:05.123Z'));
    expect(filename).toBe('docforum-payment-history-2026-10-18T09-30-05Z.csv');
    expect(filename).not.toMatch(/patient|user|pp-|ord-|email/);
  });
});
