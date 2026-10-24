import { Link, useSearchParams } from 'react-router-dom';
import { useClosures, useAffectedAppointments } from '../features/admin-closures/hooks/useClosures';
import { Spinner } from '../components/Spinner';
import { AffectedAppointments } from '../features/admin-closures/components/AffectedAppointments';
import { ClosureList } from '../features/admin-closures/components/ClosureList';

function AffectedAppointmentsReport({ closureId }: { closureId: string }) {
  const { data, isLoading } = useAffectedAppointments(closureId);

  return (
    <div className="admin-closures-page">
      <h1>Affected Appointments Report</h1>
      <p>
        Closure ID: {closureId}{' '}
        <a href="/admin/closures" style={{ color: 'var(--color-accent)' }}>← Back to closures</a>
      </p>

      {isLoading ? (
        <Spinner />
      ) : (
        <AffectedAppointments closureId={closureId} data={data} />
      )}
    </div>
  );
}

function ClosuresList() {
  const { data: closures, isLoading } = useClosures();
  const safeClosures = closures ?? [];

  return (
    <div className="admin-closures-page">
      <h1>Closure Calendar</h1>

      <Link to="/admin/closures?create" style={{ marginBottom: '16px', display: 'inline-block' }}>
        Create New Closure
      </Link>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <ClosureList facilityId={undefined} />
          {safeClosures.length > 0 && (
            <AffectedAppointments closureId={safeClosures[0].id} />
          )}
        </>
      )}
    </div>
  );
}

export function AdminClosuresPage() {
  const [searchParams] = useSearchParams();
  const closureId = searchParams.get('closureId')?.trim() || null;

  // If a closureId is in the URL, show the affected appointments report;
  // otherwise show the closures list. Split into separate components so
  // each path calls its hooks unconditionally.
  return closureId ? <AffectedAppointmentsReport closureId={closureId} /> : <ClosuresList />;
}
