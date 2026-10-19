import type { AdminUserSummary } from '../../types/admin-users';
import { maskEmail } from './utils';

interface UserTableProps {
  users: AdminUserSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function UserTable({ users, selectedId, onSelect }: UserTableProps) {
  if (users.length === 0) {
    return <p>No users match your filters.</p>;
  }

  return (
    <div className="au-table-wrap">
      <table className="au-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>
              <span className="au-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} aria-selected={u.id === selectedId}>
              <td data-label="Name">{u.name}</td>
              <td data-label="Email">{maskEmail(u.email)}</td>
              <td data-label="Role">{u.role}</td>
              <td data-label="Status">
                <span className={`au-badge au-badge-${u.status}`}>{u.status}</span>
              </td>
              <td>
                <button type="button" onClick={() => onSelect(u.id)} aria-label={`View ${u.name}`}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}