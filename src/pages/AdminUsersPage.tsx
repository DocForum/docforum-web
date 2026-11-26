import { Link } from 'react-router-dom';
import { AdminUsersConsole } from '../features/admin-users/components/AdminUsersConsole';

/** Admin user management (issue #70). */
export function AdminUsersPage() {
  return (
    <div className="container">
      <p>
        <Link to="/admin">← Back to the operations overview</Link>
      </p>
      <AdminUsersConsole />
    </div>
  );
}
