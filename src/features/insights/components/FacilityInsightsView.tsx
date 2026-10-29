import { useState } from 'react';
import { useFacilityInsights } from '../hooks/useFacilityInsights';
import { DateRangeSelector } from './DateRangeSelector';
import { FacilityTurnaroundCard } from './FacilityTurnaroundCard';
import { FacilityVolumeChart } from './FacilityVolumeChart';
import { FacilityRejectionReasonsCard } from './FacilityRejectionReasonsCard';
import { FacilityDisputeCard } from './FacilityDisputeCard';
import { Button } from '../../../components/Button';
import { InlineError } from '../../../components/states/InlineError';
import { PageError } from '../../../components/states/PageError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
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

  if (!initialData && (query.isLoading || !accessToken)) {
    return (
      <div className={styles.container}>
        <Skeleton lines={6} height="2.75rem" label="Loading facility performance insights" />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className={styles.container}>
        <PageError
          title="Could not load facility performance insights"
          message={queryErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
          fallback={{ label: 'Back to the queue', to: '/facility' }}
        />
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
        <InlineError
          title="Showing the last data loaded"
          message={queryErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      )}

      <FacilityTurnaroundCard metrics={insights.turnaround} />
      <FacilityVolumeChart days={insights.volumeByDay} />
      <FacilityRejectionReasonsCard reasons={insights.rejectionReasons} />
      <FacilityDisputeCard metrics={insights.disputes} />
    </div>
  );
}
