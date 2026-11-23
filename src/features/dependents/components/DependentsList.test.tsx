import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { DependentsList } from './DependentsList';
import { useAuthStore } from '../../../store/auth-store';
import type { Dependent } from '../../../types/models';
import { ApiError } from '../../../services/api-client';
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

/** Calendar-date-only DOB `years` years ago today, using local parts so the
 * component's age rule sees the same day. */
function dateYearsAgo(years: number): string {
  const now = new Date();
  const year = now.getFullYear() - years;
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(now.getDate(), lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

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
    await user.type(screen.getByRole('textbox', { name: /date of birth/i }), '2099-01-01');
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    expect(await screen.findByText(/cannot be in the future/i)).toBeInTheDocument();
    expect(dependentsService.addDependent).not.toHaveBeenCalled();
  });

  it('does not ask for relationship when adding', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    expect(screen.queryByLabelText(/relationship/i)).not.toBeInTheDocument();
  });

  it('adds a dependent with only the documented fields', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    vi.mocked(dependentsService.addDependent).mockResolvedValue(DEPENDENT);
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);

    await user.click(screen.getByRole('button', { name: /add dependent/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Child One');
    await user.type(screen.getByRole('textbox', { name: /date of birth/i }), '2012-05-15');
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    await waitFor(() => {
      expect(dependentsService.addDependent).toHaveBeenCalledWith(
        { fullName: 'Child One', dateOfBirth: '2012-05-15' },
        'test-token',
      );
    });
  });

  it('adds a dependent who is still 17', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    vi.mocked(dependentsService.addDependent).mockResolvedValue(DEPENDENT);
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);

    await user.click(screen.getByRole('button', { name: /add dependent/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Almost Adult');
    await user.type(screen.getByLabelText(/date of birth/i), dateYearsAgo(17));
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    await waitFor(() => {
      expect(dependentsService.addDependent).toHaveBeenCalledWith(
        { fullName: 'Almost Adult', dateOfBirth: dateYearsAgo(17) },
        'test-token',
      );
    });
  });

  it('rejects a dependent who turns 18 today', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);

    await user.click(screen.getByRole('button', { name: /add dependent/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Now Adult');
    await user.type(screen.getByLabelText(/date of birth/i), dateYearsAgo(18));
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    expect(await screen.findByText(/must be under 18/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toHaveAttribute('aria-invalid', 'true');
    expect(dependentsService.addDependent).not.toHaveBeenCalled();
  });

  it('maps the server DEPENDENT_NOT_A_MINOR error to the date field', async () => {
    vi.mocked(dependentsService.listDependents).mockResolvedValue([]);
    vi.mocked(dependentsService.addDependent).mockRejectedValue(
      new ApiError('Dependent must be under the age of majority.', 400, {
        code: 'DEPENDENT_NOT_A_MINOR',
        message: 'Dependent must be under the age of majority.',
      }),
    );
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText(/no dependents added yet/i);

    await user.click(screen.getByRole('button', { name: /add dependent/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Almost Adult');
    await user.type(screen.getByLabelText(/date of birth/i), dateYearsAgo(17));
    await user.click(screen.getByRole('button', { name: /add dependent/i }));

    expect(await screen.findByText(/not eligible for a dependent profile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date of birth/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('still edits an existing dependent who is already 18', async () => {
    const adult: Dependent = { ...DEPENDENT, dateOfBirth: dateYearsAgo(18) };
    vi.mocked(dependentsService.listDependents).mockResolvedValue([adult]);
    vi.mocked(dependentsService.updateDependent).mockResolvedValue({
      ...adult,
      fullName: 'Adult Renamed',
    });
    const user = userEvent.setup();

    render(<DependentsList />);
    await screen.findByText('Child One');

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const name = screen.getByLabelText(/full name/i);
    await user.clear(name);
    await user.type(name, 'Adult Renamed');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(dependentsService.updateDependent).toHaveBeenCalledWith(
        'dep-1',
        { fullName: 'Adult Renamed', dateOfBirth: dateYearsAgo(18), relationship: 'parent' },
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
