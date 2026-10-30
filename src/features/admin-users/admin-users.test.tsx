import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from '../../pages/AdminUsersPage';
import { adminUsersService } from '../../services/admin-users-service';
import type { AdminUserDetail, AdminUserSummary } from '../../types/admin-users';
import { LAST_ADMIN_MESSAGE } from './errors';

vi.mock('../../services/admin-users-service', () => ({
  adminUsersService: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    deactivateUser: vi.fn(),
    reactivateUser: vi.fn(),
    listInvites: vi.fn(),
    sendInvite: vi.fn(),
    revokeInvite: vi.fn(),
  },
}));

const svc = vi.mocked(adminUsersService);

const admin: AdminUserSummary = {
  id: 'u1',
  name: 'Ada Admin',
  email: 'ada@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
};
const doctor: AdminUserSummary = {
  id: 'u2',
  name: 'Dan Doctor',
  email: 'dan@example.com',
  role: 'doctor',
  status: 'deactivated',
  createdAt: '2026-02-01T00:00:00Z',
};
const detail = (u: AdminUserSummary): AdminUserDetail => ({ ...u, sessionsCount: 2 });

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminUsersPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  svc.listUsers.mockResolvedValue({ items: [admin, doctor], total: 2, page: 1, pageSize: 20 });
  svc.getUser.mockImplementation(async (id: string) => detail(id === 'u1' ? admin : doctor));
  svc.listInvites.mockResolvedValue([]);
});

afterEach(() => cleanup());

async function openUser(name: string) {
  fireEvent.click(await screen.findByRole('button', { name: `View ${name}` }));
  await screen.findByText('Active sessions');
}

describe('AdminUsersPage', () => {
  it('lists users with masked emails (no more PII than needed)', async () => {
    renderPage();
    expect(await screen.findByText('Ada Admin')).toBeTruthy();
    expect(screen.getByText('a***@example.com')).toBeTruthy();
    expect(screen.queryByText('ada@example.com')).toBeNull();
  });

  it('sends search, role and status filters to the API and resets to page 1', async () => {
    renderPage();
    await screen.findByText('Ada Admin');

    fireEvent.change(screen.getByLabelText('Search by name or email'), { target: { value: 'dan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() =>
      expect(svc.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'dan', page: 1 })),
    );

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'doctor' } });
    await waitFor(() =>
      expect(svc.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'doctor' })),
    );

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'deactivated' } });
    await waitFor(() =>
      expect(svc.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'deactivated' })),
    );
  });

  it('paginates', async () => {
    svc.listUsers.mockResolvedValue({ items: [admin], total: 45, page: 1, pageSize: 20 });
    renderPage();
    expect(await screen.findByText('Page 1 of 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(svc.listUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it('requires a reason and a confirmation before deactivating', async () => {
    svc.deactivateUser.mockResolvedValue(undefined);
    renderPage();
    await openUser('Ada Admin');

    const submit = screen.getByRole('button', { name: 'Deactivate account' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'Compromised credentials' },
    });
    fireEvent.click(submit);

    const dialog = await screen.findByRole('alertdialog');
    expect(svc.deactivateUser).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(svc.deactivateUser).toHaveBeenCalledWith('u1', 'Compromised credentials'));
  });

  it('surfaces the last-admin guard error clearly', async () => {
    svc.deactivateUser.mockRejectedValue(
      Object.assign(new Error('Cannot deactivate the last admin'), { status: 409, code: 'LAST_ADMIN' }),
    );
    renderPage();
    await openUser('Ada Admin');

    fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: 'Departed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate account' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Deactivate' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(LAST_ADMIN_MESSAGE);
  });

  it('reactivates a deactivated user with a reason', async () => {
    svc.reactivateUser.mockResolvedValue(undefined);
    renderPage();
    await openUser('Dan Doctor');

    fireEvent.change(screen.getByLabelText('Reason (required)'), {
      target: { value: 'Identity verified' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate account' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reactivate' }),
    );

    await waitFor(() => expect(svc.reactivateUser).toHaveBeenCalledWith('u2', 'Identity verified'));
  });

  it('validates, sends, lists and revokes admin invites', async () => {
    svc.listInvites.mockResolvedValue([
      { id: 'i1', email: 'new@example.com', status: 'pending', createdAt: '2026-10-01T00:00:00Z' },
    ]);
    svc.sendInvite.mockResolvedValue({
      id: 'i2',
      email: 'x@y.com',
      status: 'pending',
      createdAt: '2026-10-02T00:00:00Z',
    });
    svc.revokeInvite.mockResolvedValue(undefined);
    renderPage();
    expect(await screen.findByText('n***@example.com')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Invite email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    expect((await screen.findByRole('alert')).textContent).toContain('valid email');
    expect(svc.sendInvite).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Invite email'), { target: { value: 'x@y.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    await waitFor(() => expect(svc.sendInvite).toHaveBeenCalledWith('x@y.com'));

    fireEvent.click(screen.getByRole('button', { name: /revoke invite for/i }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke invite' }));
    await waitFor(() => expect(svc.revokeInvite).toHaveBeenCalledWith('i1'));
  });
});