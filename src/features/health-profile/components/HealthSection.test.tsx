import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { HealthSection } from './HealthSection';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import type { HealthEntry } from '../../../types/models';
import * as healthService from '../../../services/health-profile-service';

vi.mock('../../../services/health-profile-service');

const ENTRY: HealthEntry = {
  id: 'he-1',
  patientProfileId: 'pp-1',
  section: 'allergies',
  name: 'Penicillin',
  details: 'Causes rash',
  version: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('HealthSection', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({ profiles: [{ id: 'pp-1', fullName: 'Self', isSelf: true }], selectedProfileId: 'pp-1' });
    vi.mocked(healthService.listHealthEntries).mockReset();
    vi.mocked(healthService.addHealthEntry).mockReset();
    vi.mocked(healthService.updateHealthEntry).mockReset();
    vi.mocked(healthService.removeHealthEntry).mockReset();
  });

  it('renders entries', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([ENTRY]);

    render(<HealthSection section="allergies" />);

    expect(await screen.findByText('Penicillin')).toBeInTheDocument();
    expect(screen.getByText('Causes rash')).toBeInTheDocument();
  });

  it('shows empty state', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([]);

    render(<HealthSection section="allergies" />);

    expect(await screen.findByText(/none recorded/i)).toBeInTheDocument();
  });

  it('adds an entry', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([]);
    vi.mocked(healthService.addHealthEntry).mockResolvedValue(ENTRY);
    const user = userEvent.setup();

    render(<HealthSection section="allergies" />);
    await screen.findByText(/none recorded/i);

    await user.click(screen.getByRole('button', { name: /add/i }));
    await user.type(screen.getByLabelText(/name/i), 'Penicillin');
    await user.type(screen.getByLabelText(/details/i), 'Causes rash');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(healthService.addHealthEntry).toHaveBeenCalledWith(
        'pp-1',
        { section: 'allergies', name: 'Penicillin', details: 'Causes rash' },
        'test-token',
      );
    });
  });

  it('shows version history for entries with version > 1', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([
      { ...ENTRY, version: 2, previousValue: 'Amoxicillin' },
    ]);

    render(<HealthSection section="allergies" />);

    expect(await screen.findByText(/v2/)).toBeInTheDocument();
    expect(screen.getByText(/was: Amoxicillin/)).toBeInTheDocument();
  });

  it('includes selected profile ID in query key', async () => {
    vi.mocked(healthService.listHealthEntries).mockResolvedValue([]);

    render(<HealthSection section="conditions" />);

    await waitFor(() => {
      expect(healthService.listHealthEntries).toHaveBeenCalledWith(
        'pp-1',
        'conditions',
        'test-token',
        expect.any(AbortSignal),
      );
    });
  });
});
