import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../../test/render';
import { DoctorOnboarding } from './DoctorOnboarding';
import { useAuthStore } from '../../../store/auth-store';
import * as onboardingService from '../../../services/onboarding-service';
import { ApiError } from '../../../services/api-client';

vi.mock('../../../services/onboarding-service');

beforeEach(() => {
  useAuthStore.setState({ accessToken: 'test-token', user: null });
  vi.mocked(onboardingService.getDoctorOnboarding).mockReset();
});

describe('DoctorOnboarding', () => {
  it('derives documents, specialties and availability from the server summary', async () => {
    vi.mocked(onboardingService.getDoctorOnboarding).mockResolvedValue({
      documentsComplete: true,
      specialtiesComplete: true,
      availabilityComplete: false,
    });

    render(<DoctorOnboarding />);

    expect(await screen.findByText('2 of 3 done')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Finish setting up your practice' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    );

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Submit verification documents')).toBeInTheDocument();
    expect(within(items[0]).getByText('Done')).toBeInTheDocument();
    expect(within(items[1]).getByText('List your specialties')).toBeInTheDocument();
    expect(within(items[1]).getByText('Done')).toBeInTheDocument();
    expect(within(items[2]).getByText('Publish your availability')).toBeInTheDocument();
    expect(within(items[2]).getByText('To do')).toBeInTheDocument();
  });

  it('never infers completion from the client — availability stays open until the server says so', async () => {
    vi.mocked(onboardingService.getDoctorOnboarding).mockResolvedValue({
      documentsComplete: false,
      specialtiesComplete: false,
      availabilityComplete: false,
    });

    render(<DoctorOnboarding />);

    expect(await screen.findByText('0 of 3 done')).toBeInTheDocument();
    expect(screen.getAllByText('To do')).toHaveLength(3);
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('shows the doctor tour while setup is unfinished and lets it be skipped', async () => {
    vi.mocked(onboardingService.getDoctorOnboarding).mockResolvedValue({
      documentsComplete: false,
      specialtiesComplete: false,
      availabilityComplete: false,
    });
    const user = userEvent.setup();

    render(<DoctorOnboarding />);

    const tour = await screen.findByRole('region', { name: 'How DocForum works for doctors' });
    expect(within(tour).getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByRole('region', { name: 'How DocForum works for doctors' })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('hides everything once the server reports a complete setup', async () => {
    vi.mocked(onboardingService.getDoctorOnboarding).mockResolvedValue({
      documentsComplete: true,
      specialtiesComplete: true,
      availabilityComplete: true,
    });

    render(<DoctorOnboarding />);

    await waitFor(() => expect(onboardingService.getDoctorOnboarding).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('To do')).not.toBeInTheDocument());
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'How DocForum works for doctors' })).not.toBeInTheDocument();
  });

  it('degrades to a non-blocking notice when the summary fails', async () => {
    vi.mocked(onboardingService.getDoctorOnboarding).mockRejectedValue(new ApiError('offline', 500));

    render(
      <>
        <DoctorOnboarding />
        <button type="button">Run clinic</button>
      </>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent(/couldn’t check your setup just now/i);
    expect(screen.getByRole('button', { name: 'Run clinic' })).toBeEnabled();
  });
});
