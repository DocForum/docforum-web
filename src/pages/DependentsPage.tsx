import { DependentsList } from '../features/dependents/components/DependentsList';
import { HandoverNotice } from '../features/dependents/components/HandoverNotice';
import { useDependents } from '../features/dependents/hooks/useDependents';

export function DependentsPage() {
  const { data: dependents } = useDependents();
  const eligible = dependents?.filter((d) => d.handoverStatus === 'eligible' || d.handoverStatus === 'invited') ?? [];

  return (
    <div className="container">
      <div className="card">
        <DependentsList />
        {eligible.map((d) => (
          <HandoverNotice key={d.id} dependent={d} />
        ))}
      </div>
    </div>
  );
}
