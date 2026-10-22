import { useRef } from 'react';
import { PrintLayout, usePrint } from '../../../components/PrintLayout';
import { Button } from '../../../components/Button';
import type { Order } from '../../../types/models';

interface Props {
  order: Order;
  patientName: string;
  doctorName: string;
}

/** Printable + PDF-exportable order detail, wrapped in PrintLayout.
 *  Patients without smartphones carry paper orders to pharmacies and labs. */
export function OrderDetailDocument({ order, patientName, doctorName }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { onPrint, onExportPdf, isExporting, exportError } = usePrint();

  return (
    <div>
      <div className="noPrint" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={onPrint} disabled={isExporting}>
          Print order
        </Button>
        <Button variant="secondary" onClick={() => ref.current && onExportPdf(ref.current, `order-${order.id}.pdf`)} loading={isExporting}>
          {isExporting ? 'Generating\u2026' : 'Export as PDF'}
        </Button>
      </div>
      {exportError && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{exportError}</p>}

      <div ref={ref}>
        <PrintLayout title="Order detail">
          <dl style={{ display: 'grid', gap: 'var(--space-2)', margin: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Order ID</dt>
              <dd style={{ margin: 0, fontFamily: 'monospace' }}>{order.id}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Patient</dt>
              <dd style={{ margin: 0 }}>{patientName}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Issued by</dt>
              <dd style={{ margin: 0 }}>{doctorName}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Type</dt>
              <dd style={{ margin: 0 }}>{order.type === 'prescription' ? 'Prescription' : 'Lab order'}</dd>
            </div>
            {order.items.length > 0 ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>
                  {order.type === 'prescription' ? 'Medication' : 'Test'}
                </dt>
                <dd style={{ margin: 0 }}>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                    {order.items.map((item) => (
                      <li key={item.name}>
                        {item.name}
                        {item.note ? <span style={{ color: '#555' }}> — {item.note}</span> : null}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Issued</dt>
              <dd style={{ margin: 0 }}>{new Date(order.issuedAt).toLocaleDateString()}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Expires</dt>
              <dd style={{ margin: 0 }}>
                {order.expiresAt ? new Date(order.expiresAt).toLocaleDateString() : 'No expiry'}
              </dd>
            </div>
          </dl>

          <p style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid #ccc', fontSize: 'var(--text-sm)', color: '#555' }}>
            Present this order at any participating facility for fulfillment. The facility can verify this order
            by scanning the QR code or entering the token from your appointment.
          </p>
        </PrintLayout>
      </div>
    </div>
  );
}
