import { useRef } from 'react';
import { PrintLayout, usePrint } from '../../../components/PrintLayout';
import { amountLabel } from '../stroops';
import { formatDay, orderTypeLabel, refundDeadlineCopy, statusCopy, statusLabel } from '../status';
import { transactionUrl } from '../explorer';
import type { PaymentHistoryEntry } from '../../../types/models';
import { Button } from '../../../components/Button';

interface Props {
  entry: PaymentHistoryEntry;
  now: Date;
}

/** Printable + PDF-exportable payment receipt, wrapped in PrintLayout.
 *  Reuses the same data shape as the on-screen PaymentReceipt component. */
export function PaymentReceiptDocument({ entry, now }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { onPrint, onExportPdf, isExporting, exportError } = usePrint();

  const txLink = transactionUrl(entry.stellarTxHash);
  const refund = refundDeadlineCopy(entry.refundDeadlineAt, now);

  return (
    <div>
      <div className="noPrint" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={onPrint} disabled={isExporting}>
          Print receipt
        </Button>
        <Button variant="secondary" onClick={() => ref.current && onExportPdf(ref.current, `receipt-${entry.id}.pdf`)} loading={isExporting}>
          {isExporting ? 'Generating\u2026' : 'Export as PDF'}
        </Button>
      </div>
      {exportError && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{exportError}</p>}

      <div ref={ref}>
        <PrintLayout title="Receipt">
          <dl style={{ display: 'grid', gap: 'var(--space-2)', margin: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Paid on</dt>
              <dd style={{ margin: 0 }}>{formatDay(entry.createdAt)}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>For</dt>
              <dd style={{ margin: 0 }}>{orderTypeLabel(entry.orderType)}</dd>
            </div>
            {entry.facilityName ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Facility</dt>
                <dd style={{ margin: 0 }}>{entry.facilityName}</dd>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Amount</dt>
              <dd style={{ margin: 0, fontWeight: 700 }}>{amountLabel(entry.amountStroops)}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Status</dt>
              <dd style={{ margin: 0 }}>{statusLabel(entry.status)}</dd>
            </div>
            {refund ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Refund window</dt>
                <dd style={{ margin: 0 }}>{refund}</dd>
              </div>
            ) : null}
            {entry.stellarTxHash ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Transaction hash</dt>
                <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85em', wordBreak: 'break-all' }}>{entry.stellarTxHash}</dd>
              </div>
            ) : null}
            {entry.sorobanContractId ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Escrow contract</dt>
                <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.85em', wordBreak: 'break-all' }}>{entry.sorobanContractId}</dd>
              </div>
            ) : null}
          </dl>

          {entry.stellarTxHash && (
            <div className="qrPlaceholder" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: '#555', marginBottom: 'var(--space-1)' }}>
                Verify on Stellar Expert:
              </p>
              <p style={{ fontFamily: 'monospace', fontSize: '0.8em', wordBreak: 'break-all' }}>
                {txLink ?? entry.stellarTxHash}
              </p>
            </div>
          )}

          <p style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid #ccc', fontSize: 'var(--text-sm)', color: '#555' }}>
            {statusCopy(entry.status)}
          </p>
        </PrintLayout>
      </div>
    </div>
  );
}
