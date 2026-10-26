import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Spinner } from '../../../components/Spinner';
import { FormError } from '../../../components/FormError';
import { DependentForm } from './DependentForm';
import { useDependents, useAddDependent, useUpdateDependent } from '../hooks/useDependents';
import { useT } from '../../../i18n/useT';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate as formatZonedDate } from '../../../i18n/time-zone';
import { useErrorMessage } from '../../../hooks/useErrorText';
import type { Dependent, DependentInput } from '../../../types/models';
import styles from './DependentsList.module.css';

function formatDate(iso: string, timeZone: string) {
  return formatZonedDate(iso, timeZone);
}

export function DependentsList() {
  const { timeZone } = useTimeZone();
  const { data: dependents, isLoading, error: fetchError } = useDependents();
  const addMutation = useAddDependent();
  const editMutation = useUpdateDependent();
  const t = useT();
  const errorMessage = useErrorMessage();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handoverLabel(d: Dependent, timeZone: string): string {
    switch (d.handoverStatus) {
      case 'eligible':
        return t('dependents.eligible', 'Eligible for handover');
      case 'invited':
        return d.claimInviteExpiresAt
          ? t('dependents.invitedWithExpiry', 'Invite sent (expires {date})', { date: formatDate(d.claimInviteExpiresAt, timeZone) })
          : t('dependents.invited', 'Invite sent');
      case 'claimed':
        return t('dependents.claimed', 'Account claimed — you no longer manage this record');
      default:
        return '';
    }
  }

  function handleAdd(input: DependentInput) {
    addMutation.mutate(input, { onSuccess: () => setShowAdd(false) });
  }

  function handleEdit(id: string, input: DependentInput) {
    editMutation.mutate({ id, input }, { onSuccess: () => setEditingId(null) });
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size={24} />
        <span>{t('dependents.loading', 'Loading dependents…')}</span>
      </div>
    );
  }

  const apiError = errorMessage(fetchError);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('dependents.title', 'Dependents')}</h1>
        {!showAdd && (
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            {t('dependents.add', 'Add dependent')}
          </Button>
        )}
      </div>

      <FormError message={apiError} />

      <p className={styles.notice}>
        {t('dependents.notice', 'As a guardian you manage these profiles. You control their bookings and health records until they claim their own account.')}
      </p>

      {showAdd && (
        <div className={styles.formCard}>
          <DependentForm
            onSubmit={handleAdd}
            onCancel={() => { setShowAdd(false); addMutation.reset(); }}
            loading={addMutation.isPending}
            error={errorMessage(addMutation.error)}
          />
        </div>
      )}

      {dependents && dependents.length === 0 && !showAdd && (
        <p className={styles.empty}>{t('dependents.empty', 'No dependents added yet.')}</p>
      )}

      {dependents?.map((d) => (
        <div key={d.id} className={styles.card} data-status={d.handoverStatus}>
          {editingId === d.id ? (
            <DependentForm
              initial={d}
              onSubmit={(input) => handleEdit(d.id, input)}
              onCancel={() => { setEditingId(null); editMutation.reset(); }}
              loading={editMutation.isPending}
              error={errorMessage(editMutation.error)}
            />
          ) : (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.name}>{d.fullName}</span>
                <span className={styles.relationship}>{d.relationship}</span>
              </div>
              <span className={styles.dob}>
                <time dateTime={d.dateOfBirth}>
                  {t('dependents.born', 'Born {date}', {
                    date: formatDate(d.dateOfBirth, timeZone),
                  })}
                </time>
              </span>
              {d.handoverStatus !== 'not_eligible' && (
                <span className={styles.handover} data-status={d.handoverStatus}>
                  {handoverLabel(d, timeZone)}
                </span>
              )}
              {d.handoverStatus !== 'claimed' && (
                <Button variant="secondary" onClick={() => setEditingId(d.id)}>
                  {t('common.edit', 'Edit')}
                </Button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
