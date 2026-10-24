import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../../test/render';
import { LabResultDetail } from './LabResultDetail';
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

describe('LabResultDetail flag states', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(resultsService.getLabResult).mockReset();
  });

  it('normal: shows the summary with no next-steps banner', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(makeResult({ abnormalityFlag: 'normal' }));

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText('All values within range.')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.queryByText(/what happens next/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your doctor has been notified/i)).not.toBeInTheDocument();
  });

  it('abnormal (pending): reassures that the doctor was notified', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(
      makeResult({
        abnormalityFlag: 'abnormal',
        acknowledgementStatus: 'pending',
        doctorNotifiedAt: '2026-10-02T00:00:00.000Z',
        summary: 'TSH above range.',
      }),
    );

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText('Abnormal')).toBeInTheDocument();
    expect(screen.getByText(/flagged as abnormal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/your doctor has been notified/i).length).toBeGreaterThan(0);
    expect(screen.getByText('TSH above range.')).toBeInTheDocument();
  });

  it('abnormal (acknowledged): shows the review confirmation', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(
      makeResult({
        abnormalityFlag: 'abnormal',
        acknowledgementStatus: 'acknowledged',
        acknowledgedAt: '2026-10-03T00:00:00.000Z',
      }),
    );

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText(/your doctor has reviewed this result/i)).toBeInTheDocument();
  });

  it('critical (pending): shows the critical notice without alarming raw text', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(
      makeResult({
        abnormalityFlag: 'critical',
        acknowledgementStatus: 'pending',
        summary: 'Critically high potassium.',
      }),
    );

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText('Critical')).toBeInTheDocument();
    expect(screen.getByText(/flagged as critical/i)).toBeInTheDocument();
    expect(screen.getByText(/seek care promptly/i)).toBeInTheDocument();
    expect(screen.getAllByText(/your doctor has been notified/i).length).toBeGreaterThan(0);
  });

  it('critical (escalated): explains another clinician will pick it up', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(
      makeResult({
        abnormalityFlag: 'critical',
        acknowledgementStatus: 'escalated',
      }),
    );

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText(/another clinician will pick it up/i)).toBeInTheDocument();
  });

  it('withheld pending review: hides summary and file behind a waiting notice', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(
      makeResult({
        abnormalityFlag: 'critical',
        acknowledgementStatus: 'pending',
        withheldPendingReview: true,
        summary: 'Must stay hidden.',
        resultFileUrl: 'https://example.com/results/hidden.pdf',
      }),
    );

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText(/waiting for your doctor/i)).toBeInTheDocument();
    expect(screen.queryByText('Must stay hidden.')).not.toBeInTheDocument();
    expect(screen.queryByText(/download result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/result file/i)).not.toBeInTheDocument();
  });

  it('ready without a file: explains no file is attached yet', async () => {
    vi.mocked(resultsService.getLabResult).mockResolvedValue(
      makeResult({ abnormalityFlag: 'normal', resultFileUrl: null }),
    );

    render(<LabResultDetail resultId="result-1" />);

    expect(await screen.findByText(/no file attached yet/i)).toBeInTheDocument();
  });

  it('shows the backend error message when the detail fails to load', async () => {
    vi.mocked(resultsService.getLabResult).mockRejectedValue(new ApiError('Not found', 404));

    render(<LabResultDetail resultId="missing" />);

    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });
});
