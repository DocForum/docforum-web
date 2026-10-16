import { type FormEvent, useState } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import type { Dependent, DependentInput, Relationship } from '../../../types/models';
import styles from './DependentForm.module.css';

const RELATIONSHIPS: Relationship[] = ['parent', 'guardian', 'carer'];

interface Props {
  initial?: Dependent;
  onSubmit: (input: DependentInput) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function validateDob(value: string): string | null {
  if (!value) return 'Date of birth is required.';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Enter a valid date.';
  if (date > new Date()) return 'Date of birth cannot be in the future.';
  const earliest = new Date();
  earliest.setFullYear(earliest.getFullYear() - 150);
  if (date < earliest) return 'Date of birth is implausibly old.';
  return null;
}

export function DependentForm({ initial, onSubmit, onCancel, loading, error }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth?.slice(0, 10) ?? '');
  const [relationship, setRelationship] = useState<Relationship>(initial?.relationship ?? 'parent');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required.';
    const dobError = validateDob(dateOfBirth);
    if (dobError) errors.dateOfBirth = dobError;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ fullName: fullName.trim(), dateOfBirth, relationship });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <TextField
        label="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={fieldErrors.fullName}
        required
      />
      <TextField
        label="Date of birth"
        type="date"
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
        error={fieldErrors.dateOfBirth}
        required
      />
      <div className={styles.field}>
        <label className={styles.label}>Relationship</label>
        <select
          className={styles.select}
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as Relationship)}
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <FormError message={error} />
      <div className={styles.actions}>
        <Button type="submit" loading={loading}>
          {initial ? 'Save changes' : 'Add dependent'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
