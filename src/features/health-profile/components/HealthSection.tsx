import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { FormError } from '../../../components/FormError';
import { useHealthEntries, useAddHealthEntry, useUpdateHealthEntry, useRemoveHealthEntry } from '../hooks/useHealthEntries';
import { useUnsavedChangesWarning } from '../../../hooks/useUnsavedChangesWarning';
import { useTimeZone } from '../../../i18n/TimeZoneProvider';
import { formatDate } from '../../../i18n/time-zone';
import { useErrorMessage } from '../../../hooks/useErrorText';
import type { HealthSectionKey } from '../../../types/models';
import styles from './HealthSection.module.css';

const SECTION_LABELS: Record<HealthSectionKey, string> = {
  allergies: 'Allergies',
  conditions: 'Conditions',
  medications: 'Current medications',
};

interface Props {
  section: HealthSectionKey;
}

export function HealthSection({ section }: Props) {
  const { data: entries, isLoading, isError, error, refetch } = useHealthEntries(section);
  const addMutation = useAddHealthEntry();
  const updateMutation = useUpdateHealthEntry();
  const removeMutation = useRemoveHealthEntry();
  const errorMessage = useErrorMessage();
  const { timeZone } = useTimeZone();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDetails, setEditDetails] = useState('');
  // What the edit form opened with, so "dirty" means actually changed.
  const [editOriginals, setEditOriginals] = useState<{ name: string; details: string } | null>(null);

  // The idle-timeout warning (issue #82) tells the user when signing them
  // out would lose typed-but-unsaved input.
  useUnsavedChangesWarning(showAdd && (name.trim().length > 0 || details.trim().length > 0));
  useUnsavedChangesWarning(
    editingId !== null &&
      editOriginals !== null &&
      (editName !== editOriginals.name || editDetails !== editOriginals.details),
  );

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate(
      { section, name: name.trim(), details: details.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setDetails('');
          setShowAdd(false);
        },
      },
    );
  }

  function startEdit(entryId: string, currentName: string, currentDetails?: string) {
    setEditingId(entryId);
    setEditName(currentName);
    setEditDetails(currentDetails ?? '');
    setEditOriginals({ name: currentName, details: currentDetails ?? '' });
  }

  function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editName.trim() || !editingId) return;
    updateMutation.mutate(
      { entryId: editingId, section, input: { name: editName.trim(), details: editDetails.trim() || undefined } },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditOriginals(null);
        },
      },
    );
  }

  function handleRemove(entryId: string) {
    removeMutation.mutate({ entryId, section });
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{SECTION_LABELS[section]}</h2>
        {!showAdd && (
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            Add
          </Button>
        )}
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <Skeleton lines={2} label={`Loading ${SECTION_LABELS[section].toLowerCase()}`} />
        </div>
      )}

      {isError && (
        <InlineError
          title={`${SECTION_LABELS[section]} couldn't be loaded`}
          message={queryErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className={styles.inlineForm}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
          <FormError
            message={errorMessage(addMutation.error)}
          />
          <div className={styles.actions}>
            <Button type="submit" loading={addMutation.isPending}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); addMutation.reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {entries?.length === 0 && !showAdd && (
        <EmptyState
          title="None recorded"
          description={`Doctors see your ${SECTION_LABELS[section].toLowerCase()} at every consultation, so keeping this list current helps them treat you safely.`}
          action={{ label: 'Record the first one', onClick: () => setShowAdd(true) }}
        />
      )}

      {entries?.map((entry) => (
        <div key={entry.id} className={styles.entry}>
          {editingId === entry.id ? (
            <form onSubmit={handleUpdate} className={styles.inlineForm}>
              <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              <TextField label="Details (optional)" value={editDetails} onChange={(e) => setEditDetails(e.target.value)} />
              <FormError
                message={errorMessage(updateMutation.error)}
              />
              <div className={styles.actions}>
                <Button type="submit" loading={updateMutation.isPending}>
                  Save
                </Button>
            <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setEditOriginals(null); updateMutation.reset(); }}>
              Cancel
            </Button>
              </div>
            </form>
          ) : (
            <>
              <div className={styles.entryHeader}>
                <span className={styles.entryName}>{entry.name}</span>
                {entry.version > 1 && (
                  <span className={styles.version}>
                    v{entry.version} — updated{' '}
                    <time dateTime={entry.updatedAt}>{formatDate(entry.updatedAt, timeZone)}</time>
                    {entry.previousValue && <span className={styles.prev}> (was: {entry.previousValue})</span>}
                  </span>
                )}
              </div>
              {entry.details && <p className={styles.entryDetails}>{entry.details}</p>}
              <div className={styles.actions}>
                <Button variant="secondary" onClick={() => startEdit(entry.id, entry.name, entry.details)}>
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleRemove(entry.id)}
                  loading={removeMutation.isPending && removeMutation.variables?.entryId === entry.id}
                >
                  Remove
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
