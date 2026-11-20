import { useClosures } from '../hooks/useClosures';
import type { Closure } from '../../../types/models';

interface ClosureListProps {
  facilityId?: string;
}

export function ClosureList({ facilityId }: ClosureListProps) {
  const closures = useClosures(facilityId).data as Closure[];

  if (!localStorage.getItem('accessToken')) {
    return null;
  }

  return (
    <div>
      {closures.map((closure) => (
        <div key={closure.id}>
          <h3>{closure.name}</h3>
          <p>{closure.description || ''}</p>
          <p>{closure.allDay ? 'All day' : 'Custom dates'}</p>
          <p>{closure.facilityId ? 'Facility: ' + closure.facilityId : 'Platform-wide'}</p>
          <small>Status: {closure.status}</small>
          <button onClick={() => console.log('edit', closure.id)}>Edit</button>
          <button onClick={() => console.log('delete', closure.id)}>Delete</button>
        </div>
      ))}
      {closures.length === 0 && <p>No closures found.</p>}
    </div>
  );
}