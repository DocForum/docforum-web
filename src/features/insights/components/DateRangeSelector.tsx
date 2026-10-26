import { useState } from 'react';
import { useFormat } from '../../../i18n/useFormat';
import type { DateRangePreset } from '../../../types/models';
import { DatePicker } from '../../../components/DatePicker';
import styles from './PracticeInsights.module.css';

interface DateRangeSelectorProps {
  currentPreset: DateRangePreset;
  startDate?: string;
  endDate?: string;
  onChangePreset: (preset: DateRangePreset, customRange?: { startDate: string; endDate: string }) => void;
}

export function DateRangeSelector({
  currentPreset,
  startDate = '',
  endDate = '',
  onChangePreset,
}: DateRangeSelectorProps) {
  const { formatDate } = useFormat();
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [status, setStatus] = useState('');

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' },
    { id: 'custom', label: 'Custom range' },
  ];

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onChangePreset('custom', { startDate: customStart, endDate: customEnd });
      setStatus(`Custom range applied: ${formatDate(customStart)} to ${formatDate(customEnd)}.`);
    } else {
      setStatus('Choose both a start and an end date, then apply.');
    }
  };

  return (
    <div className={styles.rangeSelector} role="group" aria-label="Date range selector">
      <fieldset className={styles.presetFieldset}>
        <legend className="srOnly">Reporting period</legend>
        <div className={styles.presetGroup}>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.presetButton} ${currentPreset === p.id ? styles.presetButtonActive : ''}`}
              onClick={() => onChangePreset(p.id)}
              aria-pressed={currentPreset === p.id}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      {currentPreset === 'custom' && (
        <form onSubmit={handleApplyCustom} className={styles.customInputs}>
          <fieldset className={styles.customFieldset}>
            <legend className="srOnly">Custom date range</legend>
            <div className={styles.customInputs}>
              <DatePicker
                label="Start date"
                value={customStart}
                onChange={setCustomStart}
                max={customEnd || undefined}
                required
              />
              <span aria-hidden="true">to</span>
              <DatePicker
                label="End date"
                value={customEnd}
                onChange={setCustomEnd}
                min={customStart || undefined}
                required
              />
              <button type="submit" className={styles.presetButton}>
                Apply
              </button>
            </div>
          </fieldset>
        </form>
      )}
      <p role="status" aria-live="polite" className="srOnly">
        {status}
      </p>
    </div>
  );
}
