import { useState } from 'react';
import { InvitesSection } from '../features/admin-users/InvitesSection';
import { Pagination } from '../features/admin-users/Pagination';
import { UserDetailPanel } from '../features/admin-users/UserDetailPanel';
import { UserFilters } from '../features/admin-users/UserFilters';
import type { UserFiltersValue } from '../features/admin-users/UserFilters';
import { UserTable } from '../features/admin-users/UserTable';
import { useAdminUsers } from '../features/admin-users/hooks';
import '../features/admin-users/admin-users.css';

const PAGE_SIZE = 20;

export function AdminUsersPage() {
  const [filters, setFilters] = useState<UserFiltersValue>({ search: '', role: '', status: '' });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAdminUsers({
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  });

  const applyFilters = (next: UserFiltersValue) => {
    setFilters(next);
    setPage(1);
    setSelectedId(null);
  };

  return (
    <div className="au-page">
      <h1>User management</h1>

      <UserFilters value={filters} onChange={applyFilters} />

      {isLoading ? <p>Loading users…</p> : null}
      {isError ? (
        <p role="alert" className="au-error">
          Could not load users.{' '}
          <button type="button" onClick={() => refetch()}>
            Retry
          </button>
        </p>
      ) : null}

      {data ? (
        <>
          <UserTable users={data.items} selectedId={selectedId} onSelect={setSelectedId} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      ) : null}

      {selectedId ? (
        <UserDetailPanel key={selectedId} userId={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}

      <InvitesSection />
    </div>
  );
}