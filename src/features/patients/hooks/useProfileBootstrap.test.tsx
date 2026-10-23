import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '../../../test/render';
import { useProfileBootstrap } from './useProfileBootstrap';
import { useAuthStore } from '../../../store/auth-store';
import { useProfileStore } from '../../../store/profile-store';
import * as patientsService from '../../../services/patients-service';

vi.mock('../../../services/patients-service');

function Probe() {
  useProfileBootstrap();
  return null;
}

describe('useProfileBootstrap', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    useProfileStore.setState({ profiles: [], selectedProfileId: null });
    vi.mocked(patientsService.getMyPatientProfile).mockReset();
  });

  it('seeds the acting-for store with the signed-in profile', async () => {
    vi.mocked(patientsService.getMyPatientProfile).mockResolvedValue({
      id: 'pp-1',
      userId: 'u-1',
      fullName: 'Amara Okafor',
    });

    render(<Probe />);

    await waitFor(() => {
      expect(useProfileStore.getState().selectedProfileId).toBe('pp-1');
    });
    expect(useProfileStore.getState().profiles).toEqual([
      { id: 'pp-1', fullName: 'Amara Okafor', isSelf: true },
    ]);
  });

  it('does not call the API before a session exists', async () => {
    useAuthStore.setState({ accessToken: null });

    render(<Probe />);

    await waitFor(() => expect(useProfileStore.getState().profiles).toEqual([]));
    expect(patientsService.getMyPatientProfile).not.toHaveBeenCalled();
  });
});
