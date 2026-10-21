import { useState } from 'react';
import { useFacilityInsights } from '../hooks/useFacilityInsights';
import { DateRangeSelector } from './DateRangeSelector';
import { FacilityTurnaroundCard } from './FacilityTurnaroundCard';
import { FacilityVolumeChart } from './FacilityVolumeChart';
import { FacilityRejectionReasonsCard } from './FacilityRejectionReasonsCard';
import { FacilityDisputeCard } from './FacilityDisputeCard';
import { Spinner } from '../../../components/Spinner';
import { Button } from '../../../components/Button';
import { useAuthStore } from '../../../store/auth-store';
import { csvFilename, downloadCsv, facilityInsightsToCsv } from '../facility-insights';
import type { DateRangePreset, FacilityPerformanceInsights } from '../../../types/models';
import styles from './FacilityInsights.module.css';

interface FacilityInsightsViewProps {
  facilityId?: string;
  /** Injectable for tests so the view renders without a live query. */
  initialData?: FacilityPerformanceInsights;
}

export function FacilityInsightsView({
  facilityId = 'fac-main',
  initialData,
}: FacilityInsightsViewProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string }>();

  const query = useFacilityInsights({
    facilityId,
    preset,
    startDate: customRange?.startDate,
    endDate: customRange?.endDate,
  });

  const handleRangeChange = (
    nextPreset: DateRangePreset,
    range?: { startDate: string; endDate: string },
  ) => {
    setPreset(nextPreset);
    setCustomRange(range);
  };

  const handleExport = () => {
    if (!insights) return;
    downloadCsv(csvFilename('docforum-facility-insights'), facilityInsightsToCsv(insights));
  };

  const insights = initialData ?? query.data;

  if (!insights && (query.isLoading || !accessToken)) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingRow} role="status">
          <Spinner size={24} /> Loading facility performance insights…
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox} role="alert">
          Could not load facility performance insights
          {query.error ? `: ${query.error.message}` : '.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} aria-label="Facility performance insights dashboard">
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1>Performance insights</h1>
            <p className={styles.cardSubtitle}>
              How quickly this facility fulfils orders and how reliably, so you can spot where to
              improve and where partner support may help.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={handleExport} className={styles.exportButton}>
            Export CSV
          </Button>
        </div>

        <div className={styles.aggregateBanner} role="note">
          <span aria-hidden="true">🔒</span>
          <span>
            <strong>Aggregate data only:</strong> this view never shows patient names, order details
            or any patient-level information — only totals, rates and distributions.
          </span>
        </div>

        <DateRangeSelector
          currentPreset={preset}
          startDate={customRange?.startDate}
          endDate={customRange?.endDate}
          onChangePreset={handleRangeChange}
        />
      </header>

      {query.isError && (
        <div className={styles.caveatBanner} role="alert">
          <span className={styles.caveatPill}>Notice</span>
          <span>
            Live insights API returned an error; showing the last data loaded for this range.
          </span>
        </div>
      )}

      <FacilityTurnaroundCard metrics={insights.turnaround} />
      <FacilityVolumeChart days={insights.volumeByDay} />
      <FacilityRejectionReasonsCard reasons={insights.rejectionReasons} />
      <FacilityDisputeCard metrics={insights.disputes} />
    </div>
  );
}
