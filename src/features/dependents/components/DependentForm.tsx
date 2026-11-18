import { type FormEvent, useState } from 'react';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import type { Dependent, DependentInput, Relationship } from '../../../types/models';
import { useT } from '../../../i18n/useT';
import styles from './DependentForm.module.css';

const RELATIONSHIPS: { value: Relationship; id: string; defaultMessage: string }[] = [
  { value: 'parent', id: 'dependents.relationship.parent', defaultMessage: 'Parent' },
  { value: 'guardian', id: 'dependents.relationship.guardian', defaultMessage: 'Guardian' },
  { value: 'carer', id: 'dependents.relationship.carer', defaultMessage: 'Carer' },
];

interface Props {
  initial?: Dependent;
  onSubmit: (input: DependentInput) => void;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export function DependentForm({ initial, onSubmit, onCancel, loading, error }: Props) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth?.slice(0, 10) ?? '');
  const [relationship, setRelationship] = useState<Relationship>(initial?.relationship ?? 'parent');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const t = useT();

  function validateDob(value: string): string | null {
    if (!value) return t('validation.dobRequired', 'Date of birth is required.');
    const date = new Date(value);
    if (isNaN(date.getTime())) return t('validation.dobInvalid', 'Enter a valid date.');
    if (date > new Date()) return t('validation.dobFuture', 'Date of birth cannot be in the future.');
    const earliest = new Date();
    earliest.setFullYear(earliest.getFullYear() - 150);
    if (date < earliest) return t('validation.dobOld', 'Date of birth is implausibly old.');
    return null;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = t('validation.fullNameRequired', 'Full name is required.');
    const dobError = validateDob(dateOfBirth);
    if (dobError) errors.dateOfBirth = dobError;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ fullName: fullName.trim(), dateOfBirth, relationship });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <TextField
        label={t('dependents.fullName', 'Full name')}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={fieldErrors.fullName}
        required
      />
      <TextField
        label={t('dependents.dob', 'Date of birth')}
        type="date"
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
        error={fieldErrors.dateOfBirth}
        required
      />
      <div className={styles.field}>
        <label className={styles.label}>{t('dependents.relationship', 'Relationship')}</label>
        <select
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
      <FormError message={error} />
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
