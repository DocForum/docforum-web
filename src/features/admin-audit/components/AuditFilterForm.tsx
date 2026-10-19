import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { checkFilters, FIELD_LABELS } from '../filters';
import type { AuditTab, FilterDraft, FilterErrors } from '../filters';
import styles from './AuditLogViewer.module.css';

// Suggestions only — the inputs accept any well-formed value, since
// docforum-core adds entity types and actions as Phases 3/4 land. Source:
// docforum-core docs/api/README.md "Audit trail".
const KNOWN_ENTITY_TYPES = ['Appointment', 'DoctorProfile', 'PaymentIntent'];
const KNOWN_ACTIONS = [
  'appointment.booked',
  'doctor.verification_status_changed',
  'payment_intent.funded',
  'payment_intent.released',
  'payment_intent.refunded',
];

interface AuditFilterFormProps {
  tab: AuditTab;
  /** Values currently in the URL. Remount (via `key`) to resync the draft. */
  initial: FilterDraft;
  canClear: boolean;
  onApply: (filters: FilterDraft) => void;
  onClear: () => void;
}

export function AuditFilterForm({ tab, initial, canClear, onApply, onClear }: AuditFilterFormProps) {
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const [errors, setErrors] = useState<FilterErrors>({});
  const entityTypesId = useId();
  const actionsId = useId();

  const bind = (field: keyof FilterDraft) => ({
    label: FIELD_LABELS[field],
    value: draft[field],
    error: errors[field],
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [field]: event.target.value })),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { filters, errors: found } = checkFilters(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onApply(filters);
  };

  return (
    <form className={styles.filters} onSubmit={handleSubmit} aria-label="Filter audit entries" noValidate>
      <div className={styles.filterGrid}>
        <TextField {...bind('entityType')} list={entityTypesId} placeholder="PaymentIntent" autoComplete="off" />
        <TextField {...bind('entityId')} placeholder="Record id" autoComplete="off" spellCheck={false} />
        <TextField {...bind('actor')} placeholder="User id" autoComplete="off" spellCheck={false} />
        {tab === 'events' && (
          <TextField {...bind('action')} list={actionsId} placeholder="payment_intent" autoComplete="off" />
        )}
        <TextField {...bind('from')} type="date" max={draft.to || undefined} />
        <TextField {...bind('to')} type="date" min={draft.from || undefined} />
      </div>

      <datalist id={entityTypesId}>
        {KNOWN_ENTITY_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <datalist id={actionsId}>
        {KNOWN_ACTIONS.map((action) => (
          <option key={action} value={action} />
        ))}
      </datalist>

      <div className={styles.filterActions}>
        <Button type="submit">Apply filters</Button>
        {canClear && (
          <Button type="button" variant="secondary" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
