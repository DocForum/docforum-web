import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { useCreateSpecialtyClaim, useDeleteSpecialtyClaim, useResubmitSpecialtyClaim } from '../hooks/useSpecialtyClaims';
import { CLAIM_ITEM_STATUS_LABELS, NO_REJECTION_REASON } from '../requirements';
import type { ClaimItemStatus, DoctorSpecialtyClaim, Specialty } from '../../../types/models';
import styles from './SpecialtyClaimPicker.module.css';

interface Props {
  /** Controlled catalog from `GET /specialties` — claims are only ever made
   * against it, never typed free-form. */
  catalog: readonly Specialty[];
  claims: readonly DoctorSpecialtyClaim[];
  isLoading: boolean;
  error: string | null;
}

function messageFor(error: Error | null, fallback: string): string | null {
  if (!error) return null;
  // `apiFetch`/`apiUpload` always reject with a `message` the doctor can read;
  // the fallback is only for a rejection that arrives without one.
  return error.message || fallback;
}

function StatusTag({ status }: { status: ClaimItemStatus }) {
  return (
    <span className={styles.status} data-status={status}>
      {CLAIM_ITEM_STATUS_LABELS[status]}
    </span>
  );
}

export function SpecialtyClaimPicker({ catalog, claims, isLoading, error }: Props) {
  const createMutation = useCreateSpecialtyClaim();
  const deleteMutation = useDeleteSpecialtyClaim();
  const resubmitMutation = useResubmitSpecialtyClaim();
  const [selectedId, setSelectedId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Rejected claims stay in the list so the doctor can resubmit them — they
  // are not available for a second, parallel claim of the same specialty.
  const claimedIds = useMemo(() => new Set(claims.map((claim) => claim.specialtyId)), [claims]);
  const available = useMemo(() => catalog.filter((specialty) => !claimedIds.has(specialty.id)), [catalog, claimedIds]);

  function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) {
      setFormError('Choose a specialty to claim.');
      return;
    }
    setFormError(null);
    createMutation.mutate({ specialtyId: selectedId }, { onSuccess: () => setSelectedId('') });
  }

  if (isLoading) {
    return <p className={styles.placeholder}>Loading the specialty catalog…</p>;
  }

  if (error) {
    return <FormError message={error} />;
  }

  if (catalog.length === 0) {
    return (
      <p className={styles.placeholder}>
        The specialty catalog is empty right now, so claims cannot be added. Reload this page in a moment.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <form className={styles.form} onSubmit={handleAdd} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="specialty-claim-select">
            Specialty
          </label>
          <select
            className={styles.select}
            id="specialty-claim-select"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={createMutation.isPending || available.length === 0}
          >
            <option value="">Choose a specialty</option>
            {available.map((specialty) => (
              <option key={specialty.id} value={specialty.id}>
                {specialty.name}
              </option>
            ))}
          </select>
        </div>

        <FormError message={formError ?? messageFor(createMutation.error ?? null, 'Could not add that specialty.')} />

        <Button type="submit" loading={createMutation.isPending} disabled={available.length === 0}>
          Claim specialty
        </Button>

        {available.length === 0 && (
          <p className={styles.placeholder}>Every cataloged specialty is already on your application.</p>
        )}
      </form>

      {claims.length === 0 ? (
        <p className={styles.placeholder}>
          No specialty claims yet. Claim the specialties you practise in — each one is reviewed against your
          specialty certificate.
        </p>
      ) : (
        <ul className={styles.list}>
          {claims.map((claim) => (
            <li key={claim.id} className={styles.item} data-status={claim.status}>
              <div className={styles.itemHeader}>
                <span className={styles.specialtyName}>{claim.specialty.name}</span>
                <StatusTag status={claim.status} />
              </div>
              <span className={styles.slug}>{claim.specialty.slug}</span>

              {claim.status === 'rejected' && (
                <p className={styles.reason}>
                  <span className={styles.reasonLabel}>Reason: </span>
                  {claim.rejectionReason || NO_REJECTION_REASON}
                </p>
              )}

              <div className={styles.actions}>
                {/* Only a rejected claim can be re-queued; a verified one is
                    finished and a pending one is already with a reviewer. */}
                {claim.status === 'rejected' && (
                  <Button
                    variant="secondary"
                    onClick={() => resubmitMutation.mutate({ claimId: claim.id })}
                    loading={resubmitMutation.isPending && resubmitMutation.variables?.claimId === claim.id}
                  >
                    Resubmit claim
                  </Button>
                )}
                {claim.status !== 'verified' && (
                  <Button
                    variant="secondary"
                    onClick={() => deleteMutation.mutate({ claimId: claim.id })}
                    loading={deleteMutation.isPending && deleteMutation.variables?.claimId === claim.id}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <FormError
        message={
          messageFor(resubmitMutation.error ?? null, 'Could not resubmit that claim.') ??
          messageFor(deleteMutation.error ?? null, 'Could not withdraw that claim.')
        }
      />
    </div>
  );
}
