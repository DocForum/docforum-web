import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { DatePicker } from '../../../components/DatePicker';
import { TextField } from '../../../components/TextField';
import { checkFilters, filterFieldLabel } from '../filters';
import type { AuditTab, FilterDraft, FilterErrors } from '../filters';
import { useT } from '../../../i18n/useT';
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
  const t = useT();
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const [errors, setErrors] = useState<FilterErrors>({});
  const entityTypesId = useId();
  const actionsId = useId();

  const bind = (field: keyof FilterDraft) => ({
    label: filterFieldLabel(field, t),
    value: draft[field],
    error: errors[field],
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [field]: event.target.value })),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { filters, errors: found } = checkFilters(draft, t);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onApply(filters);
  };

  return (
    <form
      className={styles.filters}
      onSubmit={handleSubmit}
      aria-label={t('adminAudit.filters.label', 'Filter audit entries')}
      noValidate
    >
      <div className={styles.filterGrid}>
        <TextField
          {...bind('entityType')}
          list={entityTypesId}
          placeholder={t('adminAudit.filter.entityTypePlaceholder', 'PaymentIntent')}
          autoComplete="off"
        />
        <TextField
          {...bind('entityId')}
          placeholder={t('adminAudit.filter.entityIdPlaceholder', 'Record id')}
          autoComplete="off"
          spellCheck={false}
        />
        <TextField
          {...bind('actor')}
          placeholder={t('adminAudit.filter.actorPlaceholder', 'User id')}
          autoComplete="off"
          spellCheck={false}
        />
        {tab === 'events' && (
          <TextField
            {...bind('action')}
            list={actionsId}
            placeholder={t('adminAudit.filter.actionPlaceholder', 'payment_intent')}
            autoComplete="off"
          />
        )}
        <DatePicker
          label={filterFieldLabel('from', t)}
          value={draft.from}
          error={errors.from}
          onChange={(value) => setDraft((current) => ({ ...current, from: value }))}
          max={draft.to || undefined}
        />
        <DatePicker
          label={filterFieldLabel('to', t)}
          value={draft.to}
          error={errors.to}
          onChange={(value) => setDraft((current) => ({ ...current, to: value }))}
          min={draft.from || undefined}
        />
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
        <Button type="submit">{t('adminAudit.filters.apply', 'Apply filters')}</Button>
        {canClear && (
          <Button type="button" variant="secondary" onClick={onClear}>
            {t('adminAudit.filters.clear', 'Clear')}
          </Button>
        )}
      </div>
    </form>
  );
}
