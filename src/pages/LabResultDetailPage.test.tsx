import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import * as labResultsService from '../services/lab-results-service';
import type { LabResultDetail } from '../types/models';
import { render, screen } from '../test/render';
import { LabResultDetailPage } from './LabResultDetailPage';

vi.mock('../services/lab-results-service');

function detail(overrides: Partial<LabResultDetail>): LabResultDetail {
  return {
    id: 'lab-1',
    orderId: 'ord-1',
    testName: 'Full blood count',
    facilityName: 'Demo Diagnostics (fake)',
    resultedAt: '2026-10-17T10:05:00.000Z',
    status: 'available',
    flag: 'normal',
    summary: 'All values are in range.',
    requiresDoctorReview: false,
    patientProfileId: 'pp-1',
    doctorName: 'Dr. Demo',
    orderedAt: '2026-10-14T09:00:00.000Z',
    values: [],
    acknowledgement: { status: 'not_required' },
    file: {
      kind: 'pdf',
      fileName: 'result.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1000,
      contentPath: '/lab-results/lab-1/file',
    },
    ...overrides,
  };
}

function renderDetail(result: LabResultDetail) {
  vi.mocked(labResultsService.getLabResult).mockResolvedValue(result);
  return render(
    <Routes>
      <Route path="/patient/results/:resultId" element={<LabResultDetailPage />} />
    </Routes>,
    { route: '/patient/results/lab-1', role: 'patient' },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LabResultDetailPage (#24)', () => {
  it('renders a normal result without escalating it', async () => {
    renderDetail(detail({}));
    expect(await screen.findByRole('heading', { name: 'Full blood count' })).toBeInTheDocument();
    expect(screen.getByText(/in the usual range/i)).toBeInTheDocument();
    expect(screen.queryByText(/doctor has been notified/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view report/i })).toBeInTheDocument();
  });

  it('shows what happens next for an abnormal result', async () => {
    renderDetail(
      detail({
        flag: 'abnormal',
        requiresDoctorReview: true,
        acknowledgement: { status: 'pending', nextStep: 'Your doctor will call you.' },
      }),
    );
    expect(await screen.findByText(/will see this result/i)).toBeInTheDocument();
    expect(screen.getByText('Your doctor will call you.')).toBeInTheDocument();
  });

  it('reassures instead of alarming for a critical result, and says the doctor was notified', async () => {
    renderDetail(
      detail({
        flag: 'critical',
        requiresDoctorReview: true,
        acknowledgement: { status: 'pending' },
      }),
    );
    expect(await screen.findByRole('heading', { name: /doctor has been notified/i })).toBeInTheDocument();
    expect(screen.getByText(/seek urgent care/i)).toBeInTheDocument();
  });

  it('withholds a held result: no viewer, no values, an explanation', async () => {
    renderDetail(
      detail({
        status: 'held',
        flag: 'critical',
        file: null,
        values: [{ name: 'Potassium', value: '6.4', unit: 'mmol/L', referenceRange: '3.5–5.1', flag: 'critical' }],
        acknowledgement: { status: 'pending' },
      }),
    );
    expect(await screen.findByText(/held until your doctor reviews it/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the values table with an accessible caption', async () => {
    renderDetail(
      detail({
        flag: 'abnormal',
        values: [
          { name: 'Haemoglobin', value: '98', unit: 'g/L', referenceRange: '120–160', flag: 'abnormal' },
        ],
      }),
    );
    const table = await screen.findByRole('table', { name: /measured values/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Haemoglobin' })).toBeInTheDocument();
    expect(screen.getByText('Outside range')).toBeInTheDocument();
  });
});
