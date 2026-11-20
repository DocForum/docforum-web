import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '../../../test/render';
import { AbnormalResultsInbox } from './AbnormalResultsInbox';
import { useAuthStore } from '../../../store/auth-store';
import * as resultsService from '../../../services/results-service';
import * as messagingService from '../../../services/messaging-service';
import type { AbnormalResult } from '../../../types/models';

vi.mock('../../../services/results-service');
vi.mock('../../../services/messaging-service');

const RESULTS: AbnormalResult[] = [
  {
    id: 'result-1',
    patientProfileId: 'pat-1',
    patientName: 'Ada Patient',
    testName: 'Full blood count',
    value: 'Haemoglobin 7.1 g/dL',
    referenceRange: '12.0–16.0 g/dL',
    isCritical: true,
    isAbnormal: true,
    issuedAt: '2026-01-02T09:00:00Z',
  },
  {
    id: 'result-2',
    patientProfileId: 'pat-2',
    patientName: 'Ben Patient',
    testName: 'Potassium',
    value: '5.6 mmol/L',
    referenceRange: '3.5–5.1 mmol/L',
    isCritical: false,
    isAbnormal: true,
    issuedAt: '2026-01-02T08:00:00Z',
  },
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(resultsService.listPendingAbnormalResults).mockResolvedValue(RESULTS);
  vi.mocked(messagingService.findThreadIdsForPatients).mockResolvedValue({
    'pat-1': 'thread-1',
    'pat-2': 'thread-2',
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AbnormalResultsInbox', () => {
  it('opens the care thread for the result patient with a unique accessible name', async () => {
    const user = userEvent.setup();
    render(
      <>
        <AbnormalResultsInbox />
        <LocationProbe />
      </>,
      { route: '/doctor' },
    );

    const button = await screen.findByRole('button', { name: 'Message Ada Patient' });
    expect(screen.getByRole('button', { name: 'Message Ben Patient' })).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/doctor/messages/thread-1');
    });
  });

  it('does not print the patient to the console when messaging', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<AbnormalResultsInbox />, { route: '/doctor' });

    await user.click(await screen.findByRole('button', { name: 'Message Ada Patient' }));

    expect(log).not.toHaveBeenCalled();
  });

  it('hides the message action when the patient has no thread', async () => {
    vi.mocked(messagingService.findThreadIdsForPatients).mockResolvedValue({ 'pat-2': 'thread-2' });
    render(<AbnormalResultsInbox />, { route: '/doctor' });

    await screen.findByText('Ada Patient');
    await waitFor(() => {
      expect(messagingService.findThreadIdsForPatients).toHaveBeenCalledWith(
        ['pat-1', 'pat-2'],
        'test-token',
        expect.any(AbortSignal),
      );
    });

    expect(screen.queryByRole('button', { name: 'Message Ada Patient' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Message Ben Patient' })).toBeInTheDocument();
  });

  it('hides every message action when the thread lookup fails', async () => {
    vi.mocked(messagingService.findThreadIdsForPatients).mockRejectedValue(new Error('offline'));
    render(<AbnormalResultsInbox />, { route: '/doctor' });

    await screen.findByText('Ada Patient');
    await waitFor(() => {
      expect(messagingService.findThreadIdsForPatients).toHaveBeenCalled();
    });

    expect(screen.queryByRole('button', { name: /message .* patient/i })).not.toBeInTheDocument();
    // The result rows themselves stay usable for acknowledging.
    expect(screen.getAllByRole('button', { name: 'Acknowledge' })).toHaveLength(2);
  });
});
