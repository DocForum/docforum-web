import { useCallback, useState, type ReactNode } from 'react';
import styles from './PrintLayout.module.css';

// ─── Logo (inline SVG so it prints without network) ──────────────────────

function PrintLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M16 2.5 L28 9.25 V22.75 L16 29.5 L4 22.75 V9.25 Z"
        stroke="#1f4d3a"
        strokeWidth="1.75"
      />
      <path
        d="M9 20 L14 12 L19 17 L24 11"
        stroke="#1f4d3a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="11" r="2" fill="#a6763d" />
    </svg>
  );
}

// ─── PrintLayout ─────────────────────────────────────────────────────────

export interface PrintLayoutProps {
  /** Short document type, e.g. "Receipt", "Order detail", "Export summary". */
  title: string;
  /** The document body. */
  children: ReactNode;
  /** Whether to render off-screen (for print/PDF capture) vs. inline. */
  offScreen?: boolean;
}

function formatDate(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

export function PrintLayout({ title, children, offScreen = false }: PrintLayoutProps) {
  const generated = formatDate(new Date());

  return (
    <div
      className={`${styles.root} ${offScreen ? styles._visible : ''}`}
      data-print-layout="true"
      aria-label={title}
    >
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <PrintLogo />
          <p className={styles.brandName}>DocForum</p>
        </div>
        <div className={styles.metaBlock}>
          <strong>{title}</strong>
          <span>Generated {generated}</span>
        </div>
      </header>
      <main className={styles.body}>{children}</main>
      <footer className={styles.footer}>
        <span>DocForum Health Platform &mdash; confidential</span>
        <span>Generated {generated}</span>
      </footer>
    </div>
  );
}

// ─── usePrint hook ────────────────────────────────────────────────────────
// Provides onPrint (window.print) and onExportPdf (lazy-loads jspdf +
// html2canvas, never in the main bundle, no data sent to third parties).

export interface UsePrintResult {
  /** Print the document via the browser's print dialog. */
  onPrint: () => void;
  /** Export the given element to a PDF file.  Lazy-loads the PDF libraries. */
  onExportPdf: (element: HTMLElement, filename: string) => Promise<void>;
  /** Whether a PDF export is in progress. */
  isExporting: boolean;
  /** Export error, if any. */
  exportError: string | null;
}

export function usePrint(): UsePrintResult {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onPrint = useCallback(() => {
    window.print();
  }, []);

  const onExportPdf = useCallback(async (element: HTMLElement, filename: string) => {
    setIsExporting(true);
    setExportError(null);
    try {
      // Lazy-load so these libraries are never in the main bundle.
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add extra pages if content is taller than one page
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { onPrint, onExportPdf, isExporting, exportError };
}
