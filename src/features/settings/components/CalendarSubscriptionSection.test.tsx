import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { renderWithProviders, screen, server, waitFor } from '../../../test/render';
import { CalendarSubscriptionSection } from './CalendarSubscriptionSection';

const ICS_URL = 'https://calendar.example.test/feed/doctor?token=secret-token';

function serveFeed(icsUrl = ICS_URL) {
  const rotations: string[] = [];
  server.use(
    http.get('*/doctor/calendar/feed', () => HttpResponse.json({ icsUrl })),
    http.post('*/doctor/calendar/rotate', () => {
      rotations.push('rotate');
      return HttpResponse.json({ icsUrl: 'https://calendar.example.test/feed/doctor?token=rotated-token' });
    }),
  );
  return { rotations };
}

afterEach(() => server.resetHandlers());

describe('CalendarSubscriptionSection', () => {
  it('shows a loading skeleton while the feed loads', () => {
    server.use(http.get('*/doctor/calendar/feed', () => new Promise<never>(() => {})));
    renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });

    expect(screen.getByRole('status')).toHaveTextContent('Loading calendar feed…');
  });

  it('masks the feed URL until the doctor reveals it', async () => {
    serveFeed();
    const user = userEvent.setup();
    renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });

    const input = await screen.findByLabelText('Calendar feed URL');
    expect(input).not.toHaveValue(ICS_URL);
    expect(input).toHaveValue(ICS_URL.replace(/[^?]/g, '*'));

    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(input).toHaveValue(ICS_URL);
    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(input).not.toHaveValue(ICS_URL);
  });

  it('copies the feed URL to the clipboard and confirms it', async () => {
    serveFeed();
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });

    await screen.findByLabelText('Calendar feed URL');
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeDisabled();
    expect(writeText).toHaveBeenCalledWith(ICS_URL);
  });

  it('requires confirmation and swaps in the rotated URL', async () => {
    const { rotations } = serveFeed();
    const user = userEvent.setup();
    renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });

    await screen.findByLabelText('Calendar feed URL');
    await user.click(screen.getByRole('button', { name: 'Rotate feed token' }));

    expect(screen.getByRole('heading', { name: 'Rotate calendar feed URL?' })).toBeInTheDocument();
    expect(rotations).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Rotate URL' }));

    await waitFor(() => expect(rotations).toEqual(['rotate']));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Rotate calendar feed URL?' })).not.toBeInTheDocument(),
    );
    // The URL is masked again, so reveal it to check the new token replaced the old one.
    await user.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByLabelText('Calendar feed URL')).toHaveValue(
      'https://calendar.example.test/feed/doctor?token=rotated-token',
    );
  });

  it('cancelling the confirmation leaves the existing feed alone', async () => {
    const { rotations } = serveFeed();
    const user = userEvent.setup();
    renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });

    await screen.findByLabelText('Calendar feed URL');
    await user.click(screen.getByRole('button', { name: 'Rotate feed token' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('heading', { name: 'Rotate calendar feed URL?' })).not.toBeInTheDocument();
    expect(rotations).toEqual([]);
  });

  it('shows an error state when the feed cannot be loaded', async () => {
    server.use(
      http.get('*/doctor/calendar/feed', () => HttpResponse.json({ message: 'Feed unavailable' }, { status: 503 })),
    );
    renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });

    expect(await screen.findByText("The calendar feed couldn't be loaded")).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    serveFeed();
    const { container } = renderWithProviders(<CalendarSubscriptionSection />, { role: 'doctor' });
    await screen.findByLabelText('Calendar feed URL');

    expect(await axe(container)).toHaveNoViolations();
  });
});
