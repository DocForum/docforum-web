import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import type { AdminUser, AdminUserRoleFilter, AdminUserStatusFilter } from '../../../types/models';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { parseAdminUserQuery, toAdminUserSearch } from '../query';
import { AdminInvitesPanel } from './AdminInvitesPanel';
import { AdminUserDialog } from './AdminUserDialog';
import styles from './AdminUsers.module.css';

const ROLE_OPTIONS: { value: AdminUserRoleFilter; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'patient', label: 'Patients' },
  { value: 'doctor', label: 'Doctors' },
  { value: 'facility', label: 'Facility staff' },
  { value: 'admin', label: 'Admins' },
];

const STATUS_OPTIONS: { value: AdminUserStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'deactivated', label: 'Deactivated' },
];

/** Searchable, filterable, paginated user list with deactivate/reactivate
 * (issue #70). Search, role, status and page live in the URL so a refresh or a
 * shared link lands on the same view; invalid values are dropped and said so. */
export function AdminUsersConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { query, droppedInvalid } = parseAdminUserQuery(searchParams);
  const users = useAdminUsers(query);
  const [searchInput, setSearchInput] = useState(query.search);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  function update(patch: Partial<typeof query>) {
    setSearchParams(toAdminUserSearch({ ...query, ...patch }));
  }

  const totalPages = users.data ? Math.max(1, Math.ceil(users.data.total / query.pageSize)) : 1;

  return (
    <div className={styles.page}>
      {droppedInvalid && (
        <p className={styles.notice} role="status">
          Some of the filters in the link weren&apos;t recognised, so they were ignored.
        </p>
      )}

      <section className="card" aria-labelledby="admin-users-heading">
        <h1 id="admin-users-heading" className={styles.title}>
          Users
        </h1>
        <p className={styles.muted}>
          Find an account to deactivate or reactivate it. Lists show only the details needed to identify an account.
        </p>

        <form
          className={styles.filters}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: searchInput.trim(), page: 1 });
          }}
        >
          <div className={styles.field}>
            <label htmlFor="user-search" className={styles.label}>
              Search by email or name
            </label>
            <input
              id="user-search"
              type="search"
              className={styles.input}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="name@example.org"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="user-role" className={styles.label}>
              Role
            </label>
            <select
              id="user-role"
              className={styles.input}
              value={query.role}
              onChange={(event) => update({ role: event.target.value as AdminUserRoleFilter, page: 1 })}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="user-status" className={styles.label}>
              Status
            </label>
            <select
              id="user-status"
              className={styles.input}
              value={query.status}
              onChange={(event) =>
                update({ status: event.target.value as AdminUserStatusFilter, page: 1 })
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterActions}>
            <Button type="submit">Search</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchInput('');
                setSearchParams(new URLSearchParams());
              }}
            >
              Clear
            </Button>
          </div>
        </form>

        {users.isPending && <Skeleton lines={5} label="Loading users" />}

        {users.isError && (
          <InlineError
            title="We couldn't load users"
            message="Nothing has changed. Please try again."
            onRetry={() => users.refetch()}
          />
        )}

        {users.data && users.data.items.length === 0 && (
          <p className={styles.muted}>No accounts match those filters.</p>
        )}

        {users.data && users.data.items.length > 0 && (
          <>
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Users matching the current filters, page {users.data.page} of {totalPages}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.numeric}>
                    Sessions
                  </th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((user) => (
                  <tr key={user.id}>
                    <th scope="row">{user.fullName}</th>
                    <td>{user.email}</td>
                    <td className={styles.capitalise}>{user.role}</td>
                    <td>
                      <span className={user.status === 'active' ? styles.statusActive : styles.statusOff}>
                        {user.status === 'active' ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className={styles.numeric}>{user.activeSessionCount}</td>
                    <td>
                      <Button variant="secondary" size="small" onClick={() => setSelected(user)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.pagination}>
              <Button
                variant="secondary"
                size="small"
                disabled={query.page <= 1}
                onClick={() => update({ page: query.page - 1 })}
              >
                Previous
              </Button>
              <span className={styles.muted}>
                Page {users.data.page} of {totalPages} · {users.data.total}{' '}
                {users.data.total === 1 ? 'account' : 'accounts'}
              </span>
              <Button
                variant="secondary"
                size="small"
                disabled={query.page >= totalPages}
                onClick={() => update({ page: query.page + 1 })}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </section>

      <AdminInvitesPanel />

      {selected && <AdminUserDialog user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
