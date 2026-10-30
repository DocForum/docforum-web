import { useState } from 'react';
import type { AdminUserRole, AdminUserStatus } from '../../types/admin-users';

export interface UserFiltersValue {
  search: string;
  role: AdminUserRole | '';
  status: AdminUserStatus | '';
}

interface UserFiltersProps {
  value: UserFiltersValue;
  onChange: (next: UserFiltersValue) => void;
}

export function UserFilters({ value, onChange }: UserFiltersProps) {
  const [draft, setDraft] = useState(value.search);

  return (
    <form
      className="au-filters"
      role="search"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onChange({ ...value, search: draft.trim() });
      }}
    >
      <label>
        Search by name or email
        <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <button type="submit">Search</button>
      <label>
        Role
        <select
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value as UserFiltersValue['role'] })}
        >
          <option value="">All roles</option>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="facility">Facility</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <label>
        Status
        <select
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as UserFiltersValue['status'] })
          }
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </label>
    </form>
  );
}