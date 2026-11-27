import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { PatientOnboarding } from './PatientOnboarding';
import { useAuthStore } from '../../../store/auth-store';
import * as onboardingService from '../../../services/onboarding-service';
import { ApiError } from '../../../services/api-client';

vi.mock('../../../services/onboarding-service');

const NOT_STARTED = {
  profileComplete: false,
  healthProfileComplete: false,
  firstSearchComplete: false,
};

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(onboardingService.getPatientOnboarding).mockReset();
});

describe('PatientOnboarding', () => {
  it('renders the checklist from the server summary', async () => {
    vi.mocked(onboardingService.getPatientOnboarding).mockResolvedValue({
      profileComplete: true,
      healthProfileComplete: false,
      firstSearchComplete: false,
    });

    render(<PatientOnboarding />);

    expect(await screen.findByText('1 of 3 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Get set up' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    );
    expect(screen.getByText('Finish your profile')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Start: Fill in your health profile' }),
    ).toBeInTheDocument();
  });

  it('does not fetch without a session', () => {
    useAuthStore.setState({ accessToken: null });

    render(<PatientOnboarding />);

    expect(onboardingService.getPatientOnboarding).not.toHaveBeenCalled();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows an optional tour while setup is unfinished, and skips it on demand', async () => {
    vi.mocked(onboardingService.getPatientOnboarding).mockResolvedValue(NOT_STARTED);
    const user = userEvent.setup();

    render(<PatientOnboarding />);

    const tour = await screen.findByRole('region', { name: 'How DocForum works for patients' });
    // Not a modal: no dialog role, no aria-modal — the dashboard stays usable.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tour).not.toHaveAttribute('aria-modal');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Keep your health profile current' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByRole('region', { name: 'How DocForum works for patients' })).not.toBeInTheDocument();
    // Skipping the tour never skips setup: the checklist is still there.
    expect(screen.getByRole('progressbar', { name: 'Get set up' })).toBeInTheDocument();
  });

  it('closes the tour with Escape without blocking the page', async () => {
    vi.mocked(onboardingService.getPatientOnboarding).mockResolvedValue(NOT_STARTED);
    const user = userEvent.setup();

    render(
      <>
        <PatientOnboarding />
        <button type="button">Dashboard action</button>
      </>,
    );

    await screen.findByRole('region', { name: 'How DocForum works for patients' });
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('region', { name: 'How DocForum works for patients' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dashboard action' })).toBeEnabled();
  });

  it('finishes the tour on the last step', async () => {
    vi.mocked(onboardingService.getPatientOnboarding).mockResolvedValue(NOT_STARTED);
    const user = userEvent.setup();

    render(<PatientOnboarding />);

    await screen.findByRole('region', { name: 'How DocForum works for patients' });
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.queryByRole('region', { name: 'How DocForum works for patients' })).not.toBeInTheDocument();
  });

  it('hides the checklist and the tour when the server says everything is complete', async () => {
    vi.mocked(onboardingService.getPatientOnboarding).mockResolvedValue({
      profileComplete: true,
      healthProfileComplete: true,
      firstSearchComplete: true,
    });

    render(<PatientOnboarding />);

    await waitFor(() => expect(onboardingService.getPatientOnboarding).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('To do')).not.toBeInTheDocument());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'How DocForum works for patients' })).not.toBeInTheDocument();
  });

  it('reports a failed summary without blocking the dashboard', async () => {
    vi.mocked(onboardingService.getPatientOnboarding).mockRejectedValue(new ApiError('offline', 500));

    render(
      <>
        <PatientOnboarding />
        <p>Dashboard content</p>
      </>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent(/couldn’t check your setup just now/i);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'How DocForum works for patients' })).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
