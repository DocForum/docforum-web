import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../test/render';
import { AccessLogPage } from './AccessLogPage';
import * as accessLogService from '../services/access-log-service';
import { ApiError } from '../services/api-client';
import { useAuthStore } from '../store/auth-store';
import type { AccessLogEvent, AccessLogPage as AccessLogPageData } from '../types/models';

vi.mock('../services/access-log-service');

function event(overrides: Partial<AccessLogEvent> = {}): AccessLogEvent {
  return {
    id: 'ev-1',
    occurredAt: '2026-10-14T09:12:00Z',
    actorRole: 'doctor',
    actorName: 'Dr Amara Bello',
    recordType: 'health_profile',
    reason: 'consultation',
    ...overrides,
  };
}

function page(events: AccessLogEvent[], nextCursor: string | null): AccessLogPageData {
  return { events, nextCursor };
}

describe('AccessLogPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(accessLogService.listAccessLog).mockReset();
  });

  it('lists who opened the record, in words a patient can read', async () => {
    vi.mocked(accessLogService.listAccessLog).mockResolvedValue(
      page([event(), event({ id: 'ev-2', actorRole: 'facility', actorName: 'Bello Lab', recordType: 'order', reason: 'order_fulfillment' })], null),
    );

    const { container } = render(<AccessLogPage />);

    expect(await screen.findByText('Dr Amara Bello')).toBeInTheDocument();
    expect(screen.getByText(/opened your health profile/i)).toBeInTheDocument();
    expect(screen.getByText(/treating you at a visit/i)).toBeInTheDocument();
    expect(screen.getByText('Bello Lab')).toBeInTheDocument();
    expect(screen.getByText(/carry out an order for you/i)).toBeInTheDocument();

    // Edge case from the issue: a privacy screen that prints internal ids is
    // still a leak, so none of them may reach the DOM.
    expect(container.textContent).not.toMatch(/ev-1|pp-1|patientProfileId|health_profile_/);
  });

  it('loads the next cursor only when asked, and keeps what it already showed', async () => {
    vi.mocked(accessLogService.listAccessLog)
      .mockResolvedValueOnce(page([event()], 'cursor-2'))
      .mockResolvedValueOnce(page([event({ id: 'ev-9', actorName: 'Nurse Sam' })], null));

    render(<AccessLogPage />);

    await screen.findByText('Dr Amara Bello');
    expect(screen.queryByText('Nurse Sam')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /show older entries/i }));

    await waitFor(() => expect(screen.getByText('Nurse Sam')).toBeInTheDocument());
    expect(screen.getByText('Dr Amara Bello')).toBeInTheDocument();
    expect(accessLogService.listAccessLog).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-2' }),
      'test-token',
      expect.any(AbortSignal),
    );
    expect(screen.queryByRole('button', { name: /show older entries/i })).not.toBeInTheDocument();
  });

  it('sends the date range and type it was given', async () => {
    vi.mocked(accessLogService.listAccessLog).mockResolvedValue(page([], null));

    render(<AccessLogPage />);
    await waitFor(() => expect(accessLogService.listAccessLog).toHaveBeenCalled());

    // Date inputs are set directly — userEvent types them in the browser's
    // locale format, which is not what this repo's tests should depend on.
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-15' } });
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'referral');
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() =>
      expect(accessLogService.listAccessLog).toHaveBeenLastCalledWith(
        expect.objectContaining({ from: '2026-10-01', to: '2026-10-15', recordType: 'referral' }),
        'test-token',
        expect.any(AbortSignal),
      ),
    );
  });

  it('corrects a reversed range instead of fetching nothing and calling it empty', async () => {
    vi.mocked(accessLogService.listAccessLog).mockResolvedValue(page([], null));

    render(<AccessLogPage />);
    await waitFor(() => expect(accessLogService.listAccessLog).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    await userEvent.click(screen.getByRole('button', { name: /apply/i }));

    expect(await screen.findByText(/first date must be before the second/i)).toBeInTheDocument();
    expect(accessLogService.listAccessLog).toHaveBeenCalledTimes(1);
  });

  // core#45 has not landed, so the ordinary answer today is 404. "No one has
  // opened your record" would be a false privacy claim.
  it('says the log is unavailable rather than empty when the endpoint is missing', async () => {
    vi.mocked(accessLogService.listAccessLog).mockRejectedValue(new ApiError('Not Found', 404));

    render(<AccessLogPage />);

    expect(await screen.findByText(/access log is not available yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/no one has opened your record/i)).not.toBeInTheDocument();
  });

  it('keeps the entries it has and flags a later page that failed', async () => {
    vi.mocked(accessLogService.listAccessLog)
      .mockResolvedValueOnce(page([event()], 'cursor-2'))
      .mockRejectedValueOnce(new ApiError('Gateway Timeout', 504));

    render(<AccessLogPage />);

    await screen.findByText('Dr Amara Bello');
    await userEvent.click(screen.getByRole('button', { name: /show older entries/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('Dr Amara Bello')).toBeInTheDocument();
  });

  it('describes an empty log for a new account', async () => {
    vi.mocked(accessLogService.listAccessLog).mockResolvedValue(page([], null));

    render(<AccessLogPage />);

    expect(await screen.findByText(/no one has opened your record yet/i)).toBeInTheDocument();
  });

  it('will not invent a support link that no one reads', async () => {
    vi.stubEnv('VITE_SUPPORT_EMAIL', '');
    vi.mocked(accessLogService.listAccessLog).mockResolvedValue(page([], null));

    render(<AccessLogPage />);

    expect(await screen.findByText(/will not invent a link/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /report a concern/i })).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('links the concern report to the configured support address', async () => {
    vi.stubEnv('VITE_SUPPORT_EMAIL', 'privacy@docforum.test');
    vi.mocked(accessLogService.listAccessLog).mockResolvedValue(page([], null));

    render(<AccessLogPage />);

    const link = await screen.findByRole('link', { name: /report a concern/i });
    expect(link).toHaveAttribute('href', expect.stringMatching(/^mailto:privacy@docforum\.test\?subject=/));
    vi.unstubAllEnvs();
  });
});
