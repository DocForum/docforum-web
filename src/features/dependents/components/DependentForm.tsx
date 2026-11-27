import { type FormEvent, useId, useState } from 'react';
import { DatePicker } from '../../../components/DatePicker';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import type { Dependent, DependentInput, Relationship } from '../../../types/models';
import type { FormErrorInfo } from '../../../services/error-catalogue';
import { validateDependentDob } from '../age';
import { useT } from '../../../i18n/useT';
import styles from './DependentForm.module.css';

const RELATIONSHIPS: { value: Relationship; id: string; defaultMessage: string }[] = [
  { value: 'parent', id: 'dependents.relationship.parent', defaultMessage: 'Parent' },
  { value: 'guardian', id: 'dependents.relationship.guardian', defaultMessage: 'Guardian' },
  { value: 'carer', id: 'dependents.relationship.carer', defaultMessage: 'Carer' },
];

interface Props {
  initial?: Dependent;
  onSubmit: (input: Required<DependentInput>) => void;
  onCancel: () => void;
  loading: boolean;
  error: FormErrorInfo | null;
}

export function DependentForm({ initial, onSubmit, onCancel, loading, error }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth?.slice(0, 10) ?? '');
  const [relationship, setRelationship] = useState<Relationship>(initial?.relationship ?? 'parent');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const relationshipId = useId();
  const t = useT();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = t('validation.fullNameRequired', 'Full name is required.');
    // The strict create rule applies to new dependents; an existing adult
    // dependent can still have their other details edited.
    const dobError = validateDependentDob(dateOfBirth, undefined, !initial);
    if (dobError) errors.dateOfBirth = dobError;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ fullName: fullName.trim(), dateOfBirth, relationship });
  }

  // Server errors that name a field are shown on that input, not the form.
  const serverDobError = error?.field === 'dateOfBirth' ? error.message : undefined;
  const formError = error && !error.field ? error.message : null;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <TextField
        label={t('dependents.fullName', 'Full name')}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={fieldErrors.fullName}
        required
      />
      <DatePicker
        label={t('dependents.dob', 'Date of birth')}
        value={dateOfBirth}
        onChange={setDateOfBirth}
        max={new Date().toISOString().slice(0, 10)}
        error={fieldErrors.dateOfBirth ?? serverDobError}
        required
      />
      {initial && (
        <div className={styles.field}>
          <label htmlFor={relationshipId} className={styles.label}>
            {t('dependents.relationship', 'Relationship')}
          </label>
          <select
            id={relationshipId}
            className={styles.select}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as Relationship)}
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.id, r.defaultMessage)}
              </option>
            ))}
          </select>
        </div>
      )}
      <FormError message={formError} />
      <div className={styles.actions}>
        <Button type="submit" loading={loading}>
          {initial ? t('dependents.saveChanges', 'Save changes') : t('dependents.add', 'Add dependent')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          {t('common.cancel', 'Cancel')}
        </Button>
      </div>
    </form>
  );
}
