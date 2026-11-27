import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import * as adminUsersService from '../../../services/admin-users-service';
import { ApiError } from '../../../services/api-client';
import type { AdminUser } from '../../../types/models';
import { render, screen } from '../../../test/render';
import { AdminUsersConsole } from './AdminUsersConsole';

vi.mock('../../../services/admin-users-service');

const ADMIN: AdminUser = {
  id: 'usr-admin-1',
  email: 'ada.admin@example.test',
  fullName: 'Ada Admin (fake)',
  role: 'admin',
  status: 'active',
  activeSessionCount: 2,
  createdAt: '2026-01-08T09:00:00.000Z',
  lastActiveAt: '2026-11-18T16:20:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminUsersService.listAdminUsers).mockResolvedValue({
    items: [ADMIN],
    total: 1,
    page: 1,
    pageSize: 10,
  });
  vi.mocked(adminUsersService.listAdminInvites).mockResolvedValue([]);
});

describe('AdminUsersConsole (#70)', () => {
  it('lists accounts and shows the session count before a destructive action', async () => {
    render(<AdminUsersConsole />, { route: '/admin/users', role: 'admin' });

    expect(await screen.findByRole('rowheader', { name: ADMIN.fullName })).toBeInTheDocument();
    expect(screen.getByText(ADMIN.email)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('surfaces the last-admin guard clearly instead of a generic failure', async () => {
    const user = userEvent.setup();
    vi.mocked(adminUsersService.deactivateAdminUser).mockRejectedValue(
      new ApiError('cannot deactivate the last active admin', 409, undefined, { code: 'LAST_ADMIN' }),
    );

    render(<AdminUsersConsole />, { route: '/admin/users', role: 'admin' });

    await user.click(await screen.findByRole('button', { name: /manage/i }));
    const reason = screen.getByLabelText(/why are you deactivating/i);
    await user.type(reason, 'Account compromised in a phishing incident.');

    await user.click(screen.getByRole('button', { name: /^Deactivate account$/ }));
    await user.click(screen.getByRole('button', { name: /confirm deactivation/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/last active admin/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/invite or reactivate another admin first/i);
    expect(adminUsersService.deactivateAdminUser).toHaveBeenCalledWith(
      ADMIN.id,
      { reason: 'Account compromised in a phishing incident.' },
      expect.any(String),
    );
  });
});
