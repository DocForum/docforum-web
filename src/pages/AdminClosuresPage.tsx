import { Link, useSearchParams } from 'react-router-dom';
import { useClosures, useAffectedAppointments } from '../features/admin-closures/hooks/useClosures';
import { QueryState } from '../components/states/QueryState';
import { Skeleton } from '../components/states/Skeleton';
import { AffectedAppointments } from '../features/admin-closures/components/AffectedAppointments';
import { ClosureList } from '../features/admin-closures/components/ClosureList';

function AffectedAppointmentsReport({ closureId }: { closureId: string }) {
  const { data, isLoading, error, refetch } = useAffectedAppointments(closureId);

  return (
    <div className="admin-closures-page">
      <h1>Affected Appointments Report</h1>
      <p>
        Closure ID: {closureId}{' '}
        <a href="/admin/closures" style={{ color: 'var(--color-accent)' }}>← Back to closures</a>
      </p>

      <QueryState
        result={{ isPending: isLoading, isError: Boolean(error), error, data, refetch }}
        loading={<Skeleton lines={4} height="2rem" label="Loading affected appointments" />}
        errorTitle="Affected appointments couldn't be loaded"
      >
        <AffectedAppointments closureId={closureId} data={data} />
      </QueryState>
    </div>
  );
}

function ClosuresList() {
  const { data: closures, isLoading, error, refetch } = useClosures();
  const safeClosures = closures ?? [];

  return (
    <div className="admin-closures-page">
      <h1>Closure Calendar</h1>

      <Link to="/admin/closures?create" style={{ marginBottom: '16px', display: 'inline-block' }}>
        Create New Closure
      </Link>

      <QueryState
        result={{ isPending: isLoading, isError: Boolean(error), error, data: closures, refetch }}
        loading={<Skeleton lines={4} height="2rem" label="Loading closures" />}
        errorTitle="Closures couldn't be loaded"
      >
        <>
          <ClosureList facilityId={undefined} />
          {safeClosures.length > 0 && (
            <AffectedAppointments closureId={safeClosures[0].id} />
          )}
        </>
      </QueryState>
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
