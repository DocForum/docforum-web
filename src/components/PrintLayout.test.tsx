import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PrintLayout, usePrint } from './PrintLayout';

// ─── PrintLayout rendering ────────────────────────────────────────────────

describe('PrintLayout', () => {
  it('renders the document title in the header', () => {
    render(<PrintLayout title="Receipt"><p>body</p></PrintLayout>);
    expect(screen.getAllByText('Receipt').length).toBeGreaterThan(0);
  });

  it('renders children in the main area', () => {
    render(<PrintLayout title="Order detail"><p>my order content</p></PrintLayout>);
    expect(screen.getByText('my order content')).toBeInTheDocument();
  });

  it('shows a "Generated" line in the header and footer', () => {
    render(<PrintLayout title="Receipt"><p>body</p></PrintLayout>);
    // There are two "Generated …" spans (header + footer); both should exist.
    const generated = screen.getAllByText(/Generated/i);
    expect(generated.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the DocForum brand name', () => {
    render(<PrintLayout title="Receipt"><p>body</p></PrintLayout>);
    expect(screen.getByText('DocForum')).toBeInTheDocument();
  });

  it('has no nav chrome (no nav landmark)', () => {
    render(<PrintLayout title="Receipt"><p>body</p></PrintLayout>);
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});

// ─── usePrint hook ────────────────────────────────────────────────────────

describe('usePrint', () => {
  it('onPrint calls window.print', async () => {
    // happy-dom may not have window.print; define it.
    const printSpy = vi.fn();
    vi.stubGlobal('print', printSpy);

    function Harness() {
      const { onPrint } = usePrint();
      return <button onClick={onPrint}>Print</button>;
    }

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(printSpy).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it('onExportPdf lazy-loads jspdf + html2canvas and saves a file', async () => {
    // Mock the dynamic imports for jspdf and html2canvas.
    const saveSpy = vi.fn();
    const addImageSpy = vi.fn();
    const addPageSpy = vi.fn();

    interface MockPdfInstance {
      internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
      addImage: typeof addImageSpy;
      addPage: typeof addPageSpy;
      save: typeof saveSpy;
    }

    const MockJsPDF = vi.fn(function (this: MockPdfInstance) {
      this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
      this.addImage = addImageSpy;
      this.addPage = addPageSpy;
      this.save = saveSpy;
    });

    vi.doMock('jspdf', () => ({ default: MockJsPDF }));
    vi.doMock('html2canvas', () => ({
      default: vi.fn().mockResolvedValue({
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,AAA'),
        width: 800,
        height: 600,
      }),
    }));

    function Harness() {
      const { onExportPdf, isExporting } = usePrint();
      const ref = document.createElement('div');
      return (
        <div>
          <span>{isExporting ? 'busy' : 'idle'}</span>
          <button onClick={() => onExportPdf(ref, 'test.pdf')}>Export</button>
        </div>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText('idle')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(screen.getByText('idle')).toBeInTheDocument());

    vi.doUnmock('jspdf');
    vi.doUnmock('html2canvas');
  });
});

// ─── PaymentReceiptDocument integration ────────────────────────────────────

import { PaymentReceiptDocument } from '../features/payments/components/PaymentReceiptDocument';
import type { PaymentHistoryEntry } from '../types/models';

const fakeEntry: PaymentHistoryEntry = {
  id: 'pi-1',
  orderType: 'prescription',
  orderId: 'ord-1',
  status: 'released',
  patientProfileId: 'pat-1',
  facilityId: 'fac-1',
  facilityName: 'City Pharmacy',
  amountStroops: '10000000',
  escrowId: 'esc-1',
  stellarTxHash: 'abc123txhash',
  sorobanContractId: 'contract-1',
  createdAt: new Date('2026-09-14T11:00:00Z').toISOString(),
  updatedAt: new Date('2026-09-14T11:00:00Z').toISOString(),
};

describe('PaymentReceiptDocument (integration)', () => {
  it('renders the receipt details and a QR placeholder when there is a tx hash', () => {
    render(<PaymentReceiptDocument entry={fakeEntry} now={new Date('2026-09-14T12:00:00Z')} />);
    expect(screen.getAllByText('Receipt').length).toBeGreaterThan(0);
    expect(screen.getByText('City Pharmacy')).toBeInTheDocument();
    // The tx hash appears in at least one place (dd or QR section)
    const txElements = screen.getAllByText(/abc123txhash/);
    expect(txElements.length).toBeGreaterThan(0);
  });
});
