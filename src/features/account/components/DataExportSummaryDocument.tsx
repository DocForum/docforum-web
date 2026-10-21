import { useRef } from 'react';
import { PrintLayout, usePrint } from '../../../components/PrintLayout';
import { Button } from '../../../components/Button';
import type { DataExport } from '../../../types/models';

interface Props {
  exportData: DataExport;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '\u2014';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

/** Printable + PDF-exportable data export summary.  Patients can bring
 *  a printed summary to other providers as proof of their data export. */
export function DataExportSummaryDocument({ exportData }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { onPrint, onExportPdf, isExporting, exportError } = usePrint();

  return (
    <div>
      <div className="noPrint" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Button variant="secondary" onClick={onPrint} disabled={isExporting}>
          Print summary
        </Button>
        <Button variant="secondary" onClick={() => ref.current && onExportPdf(ref.current, `export-summary-${exportData.id}.pdf`)} loading={isExporting}>
          {isExporting ? 'Generating\u2026' : 'Export as PDF'}
        </Button>
      </div>
      {exportError && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{exportError}</p>}

      <div ref={ref}>
        <PrintLayout title="Export summary">
          <dl style={{ display: 'grid', gap: 'var(--space-2)', margin: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Export ID</dt>
              <dd style={{ margin: 0, fontFamily: 'monospace' }}>{exportData.id}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Status</dt>
              <dd style={{ margin: 0 }}>{exportData.status}</dd>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Requested</dt>
              <dd style={{ margin: 0 }}>{formatDate(exportData.requestedAt)}</dd>
            </div>
            {exportData.readyAt ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Ready</dt>
                <dd style={{ margin: 0 }}>{formatDate(exportData.readyAt)}</dd>
              </div>
            ) : null}
            {exportData.expiresAt ? (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <dt style={{ fontWeight: 600, minWidth: '8rem' }}>Expires</dt>
                <dd style={{ margin: 0 }}>{formatDate(exportData.expiresAt)}</dd>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <dt style={{ fontWeight: 600, minWidth: '8rem' }}>File size</dt>
              <dd style={{ margin: 0 }}>{formatBytes(exportData.fileSizeBytes)}</dd>
            </div>
          </dl>

          <p style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid #ccc', fontSize: 'var(--text-sm)', color: '#555' }}>
            This summary confirms that a personal data export was requested and processed through the DocForum
            Health Platform. The full data bundle is available for download as a JSON file (FHIR-compatible)
            for 24 hours after it becomes ready.
          </p>
        </PrintLayout>
      </div>
    </div>
  );
}
