import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { DependentsList } from './DependentsList';
import { useAuthStore } from '../../../store/auth-store';
import type { Dependent } from '../../../types/models';
import * as dependentsService from '../../../services/dependents-service';

vi.mock('../../../services/dependents-service');

const DEPENDENT: Dependent = {
  id: 'dep-1',
  guardianProfileId: 'gp-1',
  fullName: 'Child One',
  dateOfBirth: '2012-05-15',
  relationship: 'parent',
  handoverStatus: 'not_eligible',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('DependentsList', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(dependentsService.listDependents).mockReset();
    vi.mocked(dependentsService.addDependent).mockReset();
    vi.mocked(dependentsService.updateDependent).mockReset();
  });

  it('renders the list of dependents', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([DEPENDENT]);

    render(<DependentsList />);

    expect(await screen.findByText('Child One')).toBeInTheDocument();
    expect(screen.getByText('parent')).toBeInTheDocument();
  });

  it('shows empty state when no dependents', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);

    render(<DependentsList />);

    expect(await screen.findByText(/no dependents added yet/i)).toBeInTheDocument();
  });

  it('validates date of birth in the future', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);

    await user.click(screen.getByRole('button', { name: /add dependent/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Test Child');
    await user.type(screen.getByLabelText(/date of birth/i), '2099-01-01');
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    expect(await screen.findByText(/cannot be in the future/i)).toBeInTheDocument();
    expect(dependentsService.addDependent).not.toHaveBeenCalled();
  });

  it('adds a dependent', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    vi.mocked(dependentsService.addDependent).mockResolvedValue(DEPENDENT);
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);

    await user.click(screen.getByRole('button', { name: /add dependent/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Child One');
    await user.type(screen.getByLabelText(/date of birth/i), '2012-05-15');
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    await waitFor(() => {
      expect(dependentsService.addDependent).toHaveBeenCalledWith(
        { fullName: 'Child One', dateOfBirth: '2012-05-15', relationship: 'parent' },
        'test-token',
      );
    });
  });

  it('shows handover status for eligible dependents', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([
      { ...DEPENDENT, handoverStatus: 'eligible' },
    ]);

    render(<DependentsList />);

    expect(await screen.findByText(/eligible for handover/i)).toBeInTheDocument();
  });

  it('disables edit for claimed dependents', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([
      { ...DEPENDENT, handoverStatus: 'claimed' },
    ]);

    render(<DependentsList />);
    await screen.findByText('Child One');

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });
});
