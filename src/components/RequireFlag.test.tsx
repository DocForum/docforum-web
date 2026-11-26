import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { axe } from 'jest-axe';
import { renderWithProviders, screen } from '../test/render';
import { RequireFlag } from './RequireFlag';
import * as myFlagsService from '../services/my-flags-service';

vi.mock('../services/my-flags-service');

const FLAG = 'notification_preferences';

function Tree({ redirectTo }: { redirectTo?: string }) {
  return (
    <Routes>
      <Route
        path="/gated"
        element={
          <RequireFlag name={FLAG} redirectTo={redirectTo}>
            <h1>Notifications screen</h1>
          </RequireFlag>
        }
      />
      <Route path="/" element={<h1>App home</h1>} />
      <Route path="/fallback" element={<h1>Fallback screen</h1>} />
    </Routes>
  );
}

function renderGated(redirectTo?: string) {
  return renderWithProviders(<Tree redirectTo={redirectTo} />, { route: '/gated', role: 'patient' });
}

describe('RequireFlag (#290)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits for the flags request instead of flashing gated content', async () => {
    let resolve!: (value: { flags: Record<string, boolean> }) => void;
    vi.mocked(myFlagsService.getMyFlags).mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    renderGated();

    expect(await screen.findByRole('status')).toHaveTextContent('Checking feature availability…');
    expect(screen.queryByText('Notifications screen')).not.toBeInTheDocument();

    resolve({ flags: { [FLAG]: true } });

    expect(await screen.findByRole('heading', { name: 'Notifications screen' })).toBeInTheDocument();
  });

  it('announces the wait politely and names it a status region', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockReturnValue(new Promise(() => {}));

    renderGated();

    const region = await screen.findByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the guarded screen when the flag is on', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockResolvedValue({ flags: { [FLAG]: true } });

    renderGated();

    expect(await screen.findByRole('heading', { name: 'Notifications screen' })).toBeInTheDocument();
    expect(screen.queryByText('App home')).not.toBeInTheDocument();
  });

  it('sends the user to the app home when the flag is off', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockResolvedValue({ flags: { [FLAG]: false } });

    renderGated();

    expect(await screen.findByRole('heading', { name: 'App home' })).toBeInTheDocument();
    expect(screen.queryByText('Notifications screen')).not.toBeInTheDocument();
  });

  it('honours a custom redirectTo', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockResolvedValue({ flags: { [FLAG]: false } });

    renderGated('/fallback');

    expect(await screen.findByRole('heading', { name: 'Fallback screen' })).toBeInTheDocument();
  });

  it('treats a failed flags request as off', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockRejectedValue(new Error('flags unavailable'));

    renderGated();

    expect(await screen.findByRole('heading', { name: 'App home' }, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.queryByText('Notifications screen')).not.toBeInTheDocument();
  });

  it('has no detectable axe violations while loading', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockReturnValue(new Promise(() => {}));

    const { container } = renderGated();
    await screen.findByRole('status');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no detectable axe violations once the screen is granted', async () => {
    vi.mocked(myFlagsService.getMyFlags).mockResolvedValue({ flags: { [FLAG]: true } });

    const { container } = renderGated();
    await screen.findByRole('heading', { name: 'Notifications screen' });

    expect(await axe(container)).toHaveNoViolations();
  });
});
