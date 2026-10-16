import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import { LabResultsList } from './LabResultsList';
import { useAuthStore } from '../../../store/auth-store';
import { ApiError } from '../../../services/api-client';
import * as resultsService from '../../../services/results-service';
import type { LabResult } from '../../../types/models';

vi.mock('../../../services/results-service');

function makeResult(overrides: Partial<LabResult> = {}): LabResult {
  return {
    id: 'result-1',
    labOrderId: 'order-1',
    testName: 'Complete blood count',
    facilityId: 'facility-1',
    facilityName: 'Central Lab',
    status: 'ready',
    abnormalityFlag: 'normal',
    acknowledgementStatus: 'not_required',
    doctorNotifiedAt: null,
    acknowledgedAt: null,
    withheldPendingReview: false,
    summary: 'All values within range.',
    resultFileUrl: 'https://example.com/results/result-1.pdf',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('LabResultsList', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(resultsService.listMyLabResults).mockReset();
  });

  it('shows an empty state when there are no results', async () => {
    vi.mocked(resultsService.listMyLabResults).mockResolvedValue([]);

    render(<LabResultsList />);

    expect(await screen.findByText(/no results yet/i)).toBeInTheDocument();
  });

  it('renders one row per flag state with status, facility, date, summary, and flag', async () => {
    vi.mocked(resultsService.listMyLabResults).mockResolvedValue([
      makeResult({ id: 'r-normal', abnormalityFlag: 'normal', testName: 'Lipid panel' }),
      makeResult({
        id: 'r-abnormal',
        abnormalityFlag: 'abnormal',
        acknowledgementStatus: 'pending',
        testName: 'Thyroid panel',
        summary: 'TSH above range.',
      }),
      makeResult({
        id: 'r-critical',
        abnormalityFlag: 'critical',
        acknowledgementStatus: 'pending',
        testName: 'Potassium',
        summary: 'Critically high.',
      }),
    ]);

    render(<LabResultsList />);

    expect(await screen.findByText('Lipid panel')).toBeInTheDocument();
    expect(screen.getByText('Thyroid panel')).toBeInTheDocument();
    expect(screen.getByText('Potassium')).toBeInTheDocument();

    // One badge per flag state.
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Abnormal')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();

    // Row metadata: facility + status + summary.
    expect(screen.getAllByText(/Central Lab/i).length).toBeGreaterThan(0);
    expect(screen.getByText('TSH above range.')).toBeInTheDocument();
  });

  it('hides the summary behind a waiting notice when withheld for doctor review', async () => {
    vi.mocked(resultsService.listMyLabResults).mockResolvedValue([
      makeResult({
        id: 'r-withheld',
        abnormalityFlag: 'critical',
        testName: 'Troponin',
        summary: 'Should stay hidden.',
        withheldPendingReview: true,
      }),
    ]);

    render(<LabResultsList />);

    expect(await screen.findByText('Troponin')).toBeInTheDocument();
    expect(screen.getByText(/waiting for your doctor/i)).toBeInTheDocument();
    expect(screen.queryByText('Should stay hidden.')).not.toBeInTheDocument();
  });

  it('shows the backend error message when the list fails to load', async () => {
    vi.mocked(resultsService.listMyLabResults).mockRejectedValue(new ApiError('Session expired', 401));

    render(<LabResultsList />);

    expect(await screen.findByText('Session expired')).toBeInTheDocument();
  });
});
