import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../../components/Button';
import { TextField } from '../../../components/TextField';
import { FILTER_OPTIONS } from '../copy';
import type { AccessLogFilters } from '../../../services/access-log-service';
import type { AccessRecordType } from '../../../types/models';
import styles from './AccessLogFilters.module.css';

interface Props {
  onApply: (filters: AccessLogFilters) => void;
  busy: boolean;
}

const ANY_TYPE = '';

export function AccessLogFiltersForm({ onApply, busy }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [recordType, setRecordType] = useState<AccessRecordType | typeof ANY_TYPE>(ANY_TYPE);
  const [rangeError, setRangeError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A reversed range is a request that can only ever return nothing, so it
    // is corrected here rather than sent and reported as an empty log.
    if (from && to && new Date(from) > new Date(to)) {
      setRangeError('The first date must be before the second.');
      return;
    }
    setRangeError(null);
    onApply({ from: from || undefined, to: to || undefined, recordType: recordType || undefined });
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <TextField
        label="From"
        type="date"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
        max={to || undefined}
      />
      <TextField label="To" type="date" value={to} onChange={(event) => setTo(event.target.value)} min={from || undefined} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="access-log-type">
          Type
        </label>
        <select
          id="access-log-type"
          className={styles.select}
          value={recordType}
          onChange={(event) => setRecordType(event.target.value as AccessRecordType | typeof ANY_TYPE)}
        >
          <option value={ANY_TYPE}>Everything</option>
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" loading={busy}>
        Apply
      </Button>

      {rangeError && (
        <p className={styles.rangeError} role="alert">
          {rangeError}
        </p>
      )}
    </form>
  );
}
