import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../../../App';
import { SystemHealthConsole } from './SystemHealthConsole';
import { ApiError } from '../../../services/api-client';
import * as systemService from '../../../services/system-health-service';
import { useAuthStore } from '../../../store/auth-store';
import { REFRESH_INTERVAL_MS } from '../status';
import type { BackgroundJob, JobRun, OutboxSummary, ReadinessReport, Role } from '../../../types/models';

vi.mock('../../../services/system-health-service');
vi.mock('../../../services/my-flags-service', () => ({
  getMyFlags: vi.fn().mockResolvedValue({ flags: {} }),
}));

const MINUTE = 60_000;
// Fixtures are built once at import, so future times get half a minute of
// slack — "in 5 minutes" must still read that way a few seconds later.
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const fromNow = (ms: number) => new Date(Date.now() + ms + 30_000).toISOString();
// Network failures get one retry (about a second) before the query errors.
const AFTER_RETRY = { timeout: 3_000 };

const READY: ReadinessReport = {
  status: 'ready',
  checkedAt: ago(2_000),
  checks: [
    { name: 'database', status: 'pass', required: true, durationMs: 4, message: null },
    { name: 'migrations', status: 'pass', required: true, durationMs: 9, message: null },
    { name: 'config', status: 'pass', required: true, durationMs: 0, message: null },
    { name: 'stellar_rpc', status: 'pass', required: false, durationMs: 210, message: null },
  ],
};

const DEGRADED: ReadinessReport = {
  ...READY,
  status: 'degraded',
  checks: READY.checks.map((check) =>
    check.name === 'stellar_rpc' ? { ...check, status: 'fail', message: 'Timed out after 2000 ms' } : check,
  ),
};

const NOT_READY: ReadinessReport = {
  ...READY,
  status: 'not_ready',
  checks: READY.checks.map((check) =>
    check.name === 'migrations' ? { ...check, status: 'fail', message: '2 migrations pending' } : check,
  ),
};

function jobRun(overrides: Partial<JobRun>): JobRun {
  return {
    id: 'run-x',
    job: 'referral-expiry',
    status: 'succeeded',
    startedAt: ago(10 * MINUTE),
    finishedAt: ago(10 * MINUTE - 2_000),
    error: null,
    itemsProcessed: 12,
    trigger: 'schedule',
    ...overrides,
  };
}

const LAST_OK = jobRun({ id: 'run-ok' });

const HEALTHY: BackgroundJob = {
  name: 'referral-expiry',
  schedule: 'every 15 minutes',
  lastRun: LAST_OK,
  lastSuccess: LAST_OK,
  lastFailure: null,
  nextRunAt: fromNow(5 * MINUTE),
  running: false,
};

const ORDER_FAILURE = jobRun({
  id: 'run-fail',
  job: 'order-expiry',
  status: 'failed',
  startedAt: ago(20 * MINUTE),
  error: 'connect ECONNREFUSED 10.0.0.5:5432',
  itemsProcessed: null,
});

const FAILING: BackgroundJob = {
  ...HEALTHY,
  name: 'order-expiry',
  lastRun: ORDER_FAILURE,
  lastSuccess: jobRun({ id: 'run-old', job: 'order-expiry', startedAt: ago(3 * 60 * MINUTE) }),
  lastFailure: ORDER_FAILURE,
};

// The "stalled expiry job" case: nothing has run since it was due.
const OVERDUE: BackgroundJob = {
  ...HEALTHY,
  name: 'held-slot-ttl',
  schedule: 'every minute',
  nextRunAt: ago(40 * MINUTE),
  // An old failure, outside the 24-hour window.
  lastFailure: jobRun({ id: 'run-ancient', job: 'held-slot-ttl', status: 'failed', startedAt: ago(30 * 60 * MINUTE), error: 'old' }),
};

const RUNNING: BackgroundJob = { ...HEALTHY, name: 'outbox-dispatch', schedule: 'every 30 seconds', running: true };

const NEVER_RUN: BackgroundJob = {
  ...HEALTHY,
  name: 'appointment-reminders',
  schedule: '0 7 * * *',
  lastRun: null,
  lastSuccess: null,
  lastFailure: null,
  nextRunAt: fromNow(8 * 60 * MINUTE),
};

const ALL_JOBS = [HEALTHY, FAILING, OVERDUE, RUNNING, NEVER_RUN];

const OUTBOX: OutboxSummary = { pendingCount: 120, deadLetterCount: 0, oldestPendingAt: ago(3 * MINUTE) };

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function signIn(role: Role) {
  useAuthStore.setState({
    accessToken: `${role}-token`,
    user: { id: `${role}-1`, email: `${role}@docforum.org`, role, createdAt: '', updatedAt: '' },
  });
}

function renderConsole() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/system']}>
        <SystemHealthConsole />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const tile = (name: string) => screen.getByRole('group', { name });
const panel = (name: string) => screen.getByRole('region', { name });
const jobCard = (name: string) => screen.getByRole('article', { name });
const checkRow = (name: string) => within(panel('Readiness checks')).getByText(name).closest('li') as HTMLElement;

async function loaded() {
  await screen.findByRole('article', { name: 'referral-expiry' });
  await waitFor(() => expect(within(tile('API readiness')).queryByText('Checking…')).not.toBeInTheDocument());
}

beforeEach(() => {
  signIn('admin');
  vi.mocked(systemService.getReadiness).mockReset().mockResolvedValue(READY);
  vi.mocked(systemService.listJobs).mockReset().mockResolvedValue(ALL_JOBS);
  vi.mocked(systemService.getOutboxSummary).mockReset().mockResolvedValue(OUTBOX);
  vi.mocked(systemService.runJob).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SystemHealthConsole — readiness', () => {
  it('shows a ready backend with every check passing', async () => {
    renderConsole();
    await loaded();

    expect(within(tile('API readiness')).getByText('Ready')).toBeInTheDocument();
    expect(within(tile('API readiness')).getByText('All 4 checks passing')).toBeInTheDocument();
    for (const name of ['Database', 'Migrations', 'Required config', 'Stellar RPC']) {
      expect(within(checkRow(name)).getByText('Passing')).toBeInTheDocument();
    }
    expect(within(checkRow('Stellar RPC')).getByText('Optional')).toBeInTheDocument();
    expect(within(checkRow('Database')).getByText('Required')).toBeInTheDocument();
  });

  it('shows degraded readiness when an optional check fails', async () => {
    vi.mocked(systemService.getReadiness).mockResolvedValue(DEGRADED);
    renderConsole();
    await loaded();

    expect(within(tile('API readiness')).getByText('Degraded')).toBeInTheDocument();
    expect(within(tile('API readiness')).getByText('Stellar RPC failing')).toBeInTheDocument();
    expect(within(checkRow('Stellar RPC')).getByText('Failing')).toBeInTheDocument();
    expect(within(checkRow('Stellar RPC')).getByText('Timed out after 2000 ms')).toBeInTheDocument();
    expect(checkRow('Stellar RPC')).toHaveAttribute('data-tone', 'warning');
  });

  it('shows not ready when a required check fails', async () => {
    vi.mocked(systemService.getReadiness).mockResolvedValue(NOT_READY);
    renderConsole();
    await loaded();

    expect(within(tile('API readiness')).getByText('Not ready')).toBeInTheDocument();
    expect(within(checkRow('Migrations')).getByText('2 migrations pending')).toBeInTheDocument();
    expect(checkRow('Migrations')).toHaveAttribute('data-tone', 'danger');
  });

  it('shows the backend as unreachable when the check gets no answer', async () => {
    vi.mocked(systemService.getReadiness).mockRejectedValue(new TypeError('Failed to fetch'));
    renderConsole();

    await waitFor(() => expect(within(tile('API readiness')).getByText('Unreachable')).toBeInTheDocument(), AFTER_RETRY);
    expect(within(tile('API readiness')).getByText('No answer from docforum-core')).toBeInTheDocument();
    expect(within(panel('Readiness checks')).getByRole('alert')).toHaveTextContent(/didn't answer/);
    // The other sources are independent — jobs still render.
    expect(await screen.findByRole('article', { name: 'referral-expiry' })).toBeInTheDocument();
  });

  it("says when docforum-core doesn't serve readiness yet", async () => {
    vi.mocked(systemService.getReadiness).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    await waitFor(() => expect(within(tile('API readiness')).getByText('Not served')).toBeInTheDocument());
    expect(within(panel('Readiness checks')).getByRole('alert')).toHaveTextContent('docforum-core#104');
  });

  it('turns a failed poll into Unreachable instead of keeping a stale Ready', async () => {
    const user = userEvent.setup();
    renderConsole();
    await loaded();
    expect(within(tile('API readiness')).getByText('Ready')).toBeInTheDocument();

    vi.mocked(systemService.getReadiness).mockRejectedValue(new TypeError('Failed to fetch'));
    await user.click(screen.getByRole('button', { name: 'Refresh now' }));

    await waitFor(() => expect(within(tile('API readiness')).getByText('Unreachable')).toBeInTheDocument(), AFTER_RETRY);
    expect(within(panel('Readiness checks')).getByRole('alert')).toHaveTextContent('The last check that answered said “Ready”');
  });

  it('points out a response slow enough to be a cold start', async () => {
    // Step the clock forward inside the request, as a minute-long cold start would.
    let skew = 0;
    const realNow = performance.now.bind(performance);
    vi.spyOn(performance, 'now').mockImplementation(() => realNow() + skew);
    vi.mocked(systemService.getReadiness).mockImplementation(async () => {
      skew += 15_000;
      return READY;
    });

    renderConsole();
    expect(await screen.findByText(/slow enough to be a cold start/)).toBeInTheDocument();
  });
});

describe('SystemHealthConsole — background jobs', () => {
  it('shows each job’s status', async () => {
    renderConsole();
    await loaded();

    expect(within(jobCard('referral-expiry')).getByText('Healthy')).toBeInTheDocument();
    expect(within(jobCard('order-expiry')).getByText('Last run failed')).toBeInTheDocument();
    expect(within(jobCard('held-slot-ttl')).getByText('Overdue')).toBeInTheDocument();
    expect(within(jobCard('outbox-dispatch')).getByText('Running')).toBeInTheDocument();
    expect(within(jobCard('appointment-reminders')).getByText('Never run')).toBeInTheDocument();
    expect(within(tile('Background jobs')).getByText('1 failing')).toBeInTheDocument();
    expect(within(tile('Background jobs')).getByText('5 jobs · 1 running')).toBeInTheDocument();
  });

  it('shows last success, last failure and next run', async () => {
    renderConsole();
    await loaded();

    const healthy = within(jobCard('referral-expiry'));
    expect(healthy.getByText('every 15 minutes')).toBeInTheDocument();
    expect(healthy.getByText('10 minutes ago')).toBeInTheDocument();
    expect(healthy.getByText('12 items processed')).toBeInTheDocument();
    expect(healthy.getByText('None recorded')).toBeInTheDocument();
    expect(healthy.getByText('in 5 minutes')).toBeInTheDocument();

    const failing = within(jobCard('order-expiry'));
    expect(failing.getByText('3 hours ago')).toBeInTheDocument();
    expect(failing.getByText('20 minutes ago')).toBeInTheDocument();

    expect(within(jobCard('held-slot-ttl')).getByText('was due').closest('dd')).toHaveTextContent('was due 40 minutes ago');
    expect(within(jobCard('appointment-reminders')).getByText('Never')).toBeInTheDocument();
  });

  it("can't run a job that is already running", async () => {
    renderConsole();
    await loaded();

    expect(within(jobCard('outbox-dispatch')).getByRole('button', { name: 'Running…' })).toBeDisabled();
    expect(within(jobCard('referral-expiry')).getByRole('button', { name: 'Run now' })).toBeEnabled();
  });

  it('says when no jobs are registered', async () => {
    vi.mocked(systemService.listJobs).mockResolvedValue([]);
    renderConsole();

    expect(await screen.findByText('docforum-core has no background jobs registered.')).toBeInTheDocument();
    expect(within(tile('Background jobs')).getByText('None registered')).toBeInTheDocument();
  });

  it("says when docforum-core doesn't serve job history yet", async () => {
    vi.mocked(systemService.listJobs).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    expect(await within(panel('Background jobs')).findByRole('alert')).toHaveTextContent('docforum-core#100');
    expect(within(tile('Background jobs')).getByText('Not served')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Recent failures' })).not.toBeInTheDocument();
  });

  it('keeps the last job list when a refresh fails, and says it is stale', async () => {
    const user = userEvent.setup();
    renderConsole();
    await loaded();

    vi.mocked(systemService.listJobs).mockRejectedValue(new ApiError('Bad Gateway', 502));
    await user.click(screen.getByRole('button', { name: 'Refresh now' }));

    expect(await within(panel('Background jobs')).findByRole('alert')).toHaveTextContent("Couldn't refresh the job list");
    expect(jobCard('referral-expiry')).toBeInTheDocument();
  });
});

describe('SystemHealthConsole — recent failures', () => {
  it('lists failures from the last 24 hours with their errors', async () => {
    renderConsole();
    await loaded();

    const failures = within(panel('Recent failures')).getAllByRole('listitem');
    expect(failures).toHaveLength(1);
    expect(failures[0]).toHaveTextContent('order-expiry');
    expect(failures[0]).toHaveTextContent('connect ECONNREFUSED 10.0.0.5:5432');
    expect(failures[0]).toHaveTextContent('scheduled run');
    expect(within(panel('Recent failures')).queryByText('old')).not.toBeInTheDocument();
  });

  it('says when nothing has failed', async () => {
    vi.mocked(systemService.listJobs).mockResolvedValue([HEALTHY, NEVER_RUN]);
    renderConsole();

    expect(await screen.findByText('No background job has failed in the last 24 hours.')).toBeInTheDocument();
  });
});

describe('SystemHealthConsole — outbox', () => {
  it('shows the dead-letter count with the pending backlog', async () => {
    vi.mocked(systemService.getOutboxSummary).mockResolvedValue({ ...OUTBOX, deadLetterCount: 7 });
    renderConsole();

    const outbox = tile('Outbox dead letters');
    expect(await within(outbox).findByText('7')).toBeInTheDocument();
    expect(outbox).toHaveTextContent('120 pending · oldest queued 3 minutes ago');
    expect(outbox).toHaveAttribute('data-tone', 'danger');
  });

  it('is calm when nothing is dead-lettered', async () => {
    renderConsole();

    expect(await within(tile('Outbox dead letters')).findByText('0')).toBeInTheDocument();
    expect(tile('Outbox dead letters')).toHaveAttribute('data-tone', 'ok');
  });

  it("says the outbox isn't exposed when docforum-core doesn't serve it", async () => {
    vi.mocked(systemService.getOutboxSummary).mockRejectedValue(new ApiError('Not Found', 404));
    renderConsole();

    expect(await within(tile('Outbox dead letters')).findByText('Not exposed')).toBeInTheDocument();
    expect(tile('Outbox dead letters')).toHaveTextContent('docforum-core#94');
    expect(await screen.findByRole('article', { name: 'referral-expiry' })).toBeInTheDocument();
  });
});

describe('SystemHealthConsole — run now', () => {
  async function openRunDialog(user: ReturnType<typeof userEvent.setup>, jobName = 'referral-expiry') {
    renderConsole();
    await loaded();
    await user.click(within(jobCard(jobName)).getByRole('button', { name: 'Run now' }));
    return screen.getByRole('alertdialog', { name: `Run ${jobName} now?` });
  }

  it('asks for confirmation first, and Cancel runs nothing', async () => {
    const user = userEvent.setup();
    const dialog = await openRunDialog(user);

    expect(dialog).toHaveTextContent('outside its schedule (every 15 minutes)');
    expect(dialog).toHaveTextContent("won't start a second run");
    // Focus starts on Cancel, so a stray Enter doesn't fire the job.
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(systemService.runJob).not.toHaveBeenCalled();
    expect(within(jobCard('referral-expiry')).getByRole('button', { name: 'Run now' })).toHaveFocus();
  });

  it('closes on Escape without running anything', async () => {
    const user = userEvent.setup();
    await openRunDialog(user);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(systemService.runJob).not.toHaveBeenCalled();
  });

  it('runs the job once confirmed and shows the result, then refreshes the list', async () => {
    const user = userEvent.setup();
    vi.mocked(systemService.runJob).mockResolvedValue(
      jobRun({ id: 'run-manual', startedAt: ago(3_000), finishedAt: ago(1_000), itemsProcessed: 4, trigger: 'manual' }),
    );
    const dialog = await openRunDialog(user);
    const listCalls = vi.mocked(systemService.listJobs).mock.calls.length;

    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));

    const result = await within(dialog).findByRole('status');
    expect(result).toHaveTextContent('Run finished');
    expect(result).toHaveTextContent('Processed 4 items in 2 s.');
    expect(systemService.runJob).toHaveBeenCalledExactlyOnceWith('referral-expiry', 'admin-token');
    expect(dialog).toHaveAccessibleName('Manual run: referral-expiry');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    await waitFor(() => expect(vi.mocked(systemService.listJobs).mock.calls.length).toBeGreaterThan(listCalls));

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the error when the run fails', async () => {
    const user = userEvent.setup();
    vi.mocked(systemService.runJob).mockResolvedValue(
      jobRun({ status: 'failed', error: 'Stellar RPC timed out', startedAt: ago(5_000), finishedAt: ago(500) }),
    );
    const dialog = await openRunDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));

    const result = await within(dialog).findByRole('status');
    expect(result).toHaveTextContent('Run failed');
    expect(result).toHaveTextContent('Stellar RPC timed out (after 4.5 s)');
    expect(result).toHaveAttribute('data-tone', 'danger');
  });

  it('says so when the run outlives the request', async () => {
    const user = userEvent.setup();
    vi.mocked(systemService.runJob).mockResolvedValue(jobRun({ status: 'running', finishedAt: null }));
    const dialog = await openRunDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));

    expect(await within(dialog).findByRole('status')).toHaveTextContent('Run started');
  });

  it('explains a 409 as another instance already running it', async () => {
    const user = userEvent.setup();
    vi.mocked(systemService.runJob).mockRejectedValue(new ApiError('Job is locked', 409));
    const dialog = await openRunDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));

    const result = await within(dialog).findByRole('status');
    expect(result).toHaveTextContent('Already running');
    expect(result).toHaveTextContent('Another instance is running referral-expiry right now');
  });

  it("is honest when it couldn't confirm the run", async () => {
    const user = userEvent.setup();
    vi.mocked(systemService.runJob).mockRejectedValue(new TypeError('Failed to fetch'));
    const dialog = await openRunDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));

    const result = await within(dialog).findByRole('status');
    expect(result).toHaveTextContent("Couldn't confirm");
    expect(result).toHaveTextContent('may or may not have started');
  });

  it("can't be dismissed while the run is in flight", async () => {
    const user = userEvent.setup();
    let finish!: (run: JobRun) => void;
    vi.mocked(systemService.runJob).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const dialog = await openRunDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Run now' }));

    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /Running/ })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await act(async () => finish(jobRun({})));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Run finished');
  });
});

describe('SystemHealthConsole — auto-refresh', () => {
  const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  };

  const callCounts = () => [
    vi.mocked(systemService.getReadiness).mock.calls.length,
    vi.mocked(systemService.listJobs).mock.calls.length,
    vi.mocked(systemService.getOutboxSummary).mock.calls.length,
  ];

  beforeEach(() => {
    // Only the polling interval is faked; everything else keeps real time.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    setVisibility('visible');
  });

  it('polls every source while the tab is visible', async () => {
    renderConsole();
    await loaded();
    expect(callCounts()).toEqual([1, 1, 1]);

    act(() => vi.advanceTimersByTime(REFRESH_INTERVAL_MS));

    await vi.waitFor(() => expect(callCounts()).toEqual([2, 2, 2]));
    expect(screen.getByText(/Refreshes every 30 seconds while this tab is visible/)).toBeInTheDocument();
  });

  it('stops polling while the tab is hidden and catches up when it comes back', async () => {
    renderConsole();
    await loaded();

    setVisibility('hidden');
    await act(async () => {
      vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 3);
    });
    expect(callCounts()).toEqual([1, 1, 1]);

    setVisibility('visible');
    // React Query listens on window, as browsers bubble the event there.
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'));
    });
    await vi.waitFor(() => expect(callCounts()).toEqual([2, 2, 2]));
  });
});

describe('/admin/system route', () => {
  function renderApp() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/system']}>
          <App />
          <LocationProbe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('is reachable by admins and linked from the admin nav', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'System health', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'System' })).toHaveAttribute('href', '/admin/system');
  });

  it.each<Role>(['patient', 'doctor', 'facility'])('redirects a %s away without fetching anything', async (role) => {
    signIn(role);
    renderApp();

    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe(`/${role}`));
    expect(screen.queryByRole('heading', { name: 'System health' })).not.toBeInTheDocument();
    expect(systemService.getReadiness).not.toHaveBeenCalled();
    expect(systemService.listJobs).not.toHaveBeenCalled();
    expect(systemService.getOutboxSummary).not.toHaveBeenCalled();
  });
});
