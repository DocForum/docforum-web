import { useState } from 'react';
import type { DateRangePreset } from '../../../types/models';
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
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

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
    }
  };

  return (
    <div className={styles.rangeSelector} aria-label="Date range selector">
      <div className={styles.presetGroup} role="group" aria-label="Quick presets">
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

      {currentPreset === 'custom' && (
        <form onSubmit={handleApplyCustom} className={styles.customInputs} aria-label="Custom dates">
          <label htmlFor="custom-start-date" className={styles.srOnly}>Start date</label>
          <input
            id="custom-start-date"
            type="date"
            className={styles.dateInput}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            required
            aria-label="Start date"
          />
          <span aria-hidden="true">to</span>
          <label htmlFor="custom-end-date" className={styles.srOnly}>End date</label>
          <input
            id="custom-end-date"
            type="date"
            className={styles.dateInput}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            required
            aria-label="End date"
          />
          <button type="submit" className={styles.presetButton}>
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
