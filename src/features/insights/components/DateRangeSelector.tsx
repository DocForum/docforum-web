import { useState } from 'react';
import { DatePicker } from '../../../components/DatePicker';
import { useFormat } from '../../../i18n/useFormat';
import { useT } from '../../../i18n/useT';
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
  const { formatDate } = useFormat();
  const t = useT();
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const [status, setStatus] = useState('');

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: '7d', label: t('insights.range.last7Days', 'Last 7 days') },
    { id: '30d', label: t('insights.range.last30Days', 'Last 30 days') },
    { id: '90d', label: t('insights.range.last90Days', 'Last 90 days') },
    { id: 'custom', label: t('insights.range.custom', 'Custom range') },
  ];

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onChangePreset('custom', { startDate: customStart, endDate: customEnd });
      setStatus(
        t('insights.range.applied', 'Custom range applied: {start} to {end}.', {
          start: formatDate(customStart),
          end: formatDate(customEnd),
        }),
      );
    } else {
      setStatus(t('insights.range.chooseBoth', 'Choose both a start and an end date, then apply.'));
    }
  };

  return (
    <div className={styles.rangeSelector} role="group" aria-label={t('insights.range.label', 'Date range selector')}>
      <fieldset className={styles.presetFieldset}>
        <legend className="srOnly">{t('insights.range.reportingPeriod', 'Reporting period')}</legend>
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
            <legend className="srOnly">{t('insights.range.customRange', 'Custom date range')}</legend>
            <div className={styles.customInputs}>
              <DatePicker
                id="custom-start-date"
                label={t('insights.range.startDate', 'Start date')}
                hideLabel
                value={customStart}
                onChange={setCustomStart}
                max={customEnd || undefined}
                required
              />
              <span aria-hidden="true">{t('insights.range.to', 'to')}</span>
              <DatePicker
                id="custom-end-date"
                label={t('insights.range.endDate', 'End date')}
                hideLabel
                value={customEnd}
                onChange={setCustomEnd}
                min={customStart || undefined}
                required
              />
              <button type="submit" className={styles.presetButton}>
                {t('insights.range.apply', 'Apply')}
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
