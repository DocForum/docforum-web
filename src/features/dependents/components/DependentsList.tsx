import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { FormError } from '../../../components/FormError';
import { DependentForm } from './DependentForm';
import { useDependents, useAddDependent, useUpdateDependent } from '../hooks/useDependents';
import { describeDependentError } from '../../../services/error-catalogue';
import type { Dependent, DependentInput } from '../../../types/models';
import styles from './DependentsList.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function handoverLabel(d: Dependent): string {
  switch (d.handoverStatus) {
    case 'eligible':
      return 'Eligible for handover';
    case 'invited':
      return `Invite sent${d.claimInviteExpiresAt ? ` (expires ${formatDate(d.claimInviteExpiresAt)})` : ''}`;
    case 'claimed':
      return 'Account claimed — you no longer manage this record';
    default:
      return '';
  }
}

export function DependentsList() {
  const { data: dependents, isLoading, error: fetchError } = useDependents();
  const addMutation = useAddDependent();
  const editMutation = useUpdateDependent();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(input: DependentInput) {
    // docforum-core accepts only these two fields on create.
    addMutation.mutate(
      { fullName: input.fullName, dateOfBirth: input.dateOfBirth },
      { onSuccess: () => setShowAdd(false) },
    );
  }

  function handleEdit(id: string, input: DependentInput) {
    editMutation.mutate({ id, input }, { onSuccess: () => setEditingId(null) });
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size={24} />
        <span>Loading dependents…</span>
      </div>
    );
  }

  const apiError = describeDependentError(fetchError, 'Failed to load dependents.')?.message ?? null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Dependents</h2>
        {!showAdd && (
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            Add dependent
          </Button>
        )}
      </div>

      <FormError message={apiError} />

      <p className={styles.notice}>
        As a guardian you manage these profiles. You control their bookings and health records until they claim their own account.
      </p>

      {showAdd && (
        <div className={styles.formCard}>
          <DependentForm
            onSubmit={handleAdd}
            onCancel={() => { setShowAdd(false); addMutation.reset(); }}
            loading={addMutation.isPending}
            error={describeDependentError(addMutation.error, 'Failed to add dependent.')}
          />
        </div>
      )}

      {dependents && dependents.length === 0 && !showAdd && (
        <p className={styles.empty}>No dependents added yet.</p>
      )}

      {dependents?.map((d) => (
        <div key={d.id} className={styles.card} data-status={d.handoverStatus}>
          {editingId === d.id ? (
            <DependentForm
              initial={d}
              onSubmit={(input) => handleEdit(d.id, input)}
              onCancel={() => { setEditingId(null); editMutation.reset(); }}
              loading={editMutation.isPending}
              error={describeDependentError(editMutation.error, 'Failed to save.')}
            />
          ) : (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.name}>{d.fullName}</span>
                <span className={styles.relationship}>{d.relationship}</span>
              </div>
              <span className={styles.dob}>Born {formatDate(d.dateOfBirth)}</span>
              {d.handoverStatus !== 'not_eligible' && (
                <span className={styles.handover} data-status={d.handoverStatus}>
                  {handoverLabel(d)}
                </span>
              )}
              {d.handoverStatus !== 'claimed' && (
                <Button variant="secondary" onClick={() => setEditingId(d.id)}>
                  Edit
                </Button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
