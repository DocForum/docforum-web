import { type FormEvent, useState } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { Spinner } from '../../../components/Spinner';
import { FormError } from '../../../components/FormError';
import { useHealthEntries, useAddHealthEntry, useUpdateHealthEntry, useRemoveHealthEntry } from '../hooks/useHealthEntries';
import { ApiError } from '../../../services/api-client';
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
  const { data: entries, isLoading } = useHealthEntries(section);
  const addMutation = useAddHealthEntry();
  const updateMutation = useUpdateHealthEntry();
  const removeMutation = useRemoveHealthEntry();

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDetails, setEditDetails] = useState('');

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
  }

  function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editName.trim() || !editingId) return;
    updateMutation.mutate(
      { entryId: editingId, section, input: { name: editName.trim(), details: editDetails.trim() || undefined } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function handleRemove(entryId: string) {
    removeMutation.mutate({ entryId, section });
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{SECTION_LABELS[section]}</h3>
        {!showAdd && (
          <Button variant="secondary" onClick={() => setShowAdd(true)}>
            Add
          </Button>
        )}
      </div>

      {isLoading && (
        <div className={styles.loading}>
          <Spinner size={18} />
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className={styles.inlineForm}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
          <FormError
            message={addMutation.error instanceof ApiError ? addMutation.error.message : addMutation.error ? 'Failed to add.' : null}
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

      {entries?.length === 0 && !showAdd && <p className={styles.empty}>None recorded.</p>}

      {entries?.map((entry) => (
        <div key={entry.id} className={styles.entry}>
          {editingId === entry.id ? (
            <form onSubmit={handleUpdate} className={styles.inlineForm}>
              <TextField label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
              <TextField label="Details (optional)" value={editDetails} onChange={(e) => setEditDetails(e.target.value)} />
              <FormError
                message={updateMutation.error instanceof ApiError ? updateMutation.error.message : updateMutation.error ? 'Failed to save.' : null}
              />
              <div className={styles.actions}>
                <Button type="submit" loading={updateMutation.isPending}>
                  Save
                </Button>
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); updateMutation.reset(); }}>
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
                    v{entry.version} — updated {new Date(entry.updatedAt).toLocaleDateString()}
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
