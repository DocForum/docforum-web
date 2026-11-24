import { useState } from 'react';
import { useDoctorInsights } from '../hooks/useDoctorInsights';
import { DateRangeSelector } from './DateRangeSelector';
import { UtilisationChart } from './UtilisationChart';
import { NoShowMetricsCard } from './NoShowMetricsCard';
import { TurnaroundMetricsCard } from './TurnaroundMetricsCard';
import { QueryState } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { EmptyState } from '../../../components/states/EmptyState';
import { useT } from '../../../i18n/useT';
import type { DateRangePreset, DoctorPracticeInsights } from '../../../types/models';
import styles from './PracticeInsights.module.css';

/** A range with no appointments is a successful, genuinely empty result —
 * not an error and not a reason to invent a preview dataset. */
export function isEmptyInsights(insights: DoctorPracticeInsights): boolean {
  return (
    insights.utilisation.overallOfferedSlots === 0 &&
    insights.noShows.totalScheduled === 0
  );
}

function InsightsSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div className={styles.skeletonStack}>
      <Skeleton lines={4} height="2.5rem" label={loadingLabel} />
      <Skeleton lines={4} height="2.5rem" label={loadingLabel} />
      <Skeleton lines={4} height="2.5rem" label={loadingLabel} />
    </div>
  );
}

export function PracticeInsightsView() {
  const t = useT();
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | undefined>();

  const { data, isPending, isError, error, refetch } = useDoctorInsights({
    preset,
    startDate: customRange?.startDate,
    endDate: customRange?.endDate,
  });

  const handleRangeChange = (newPreset: DateRangePreset, range?: { startDate: string; endDate: string }) => {
    setPreset(newPreset);
    if (range) {
      setCustomRange(range);
    } else {
      setCustomRange(undefined);
    }
  };

  return (
    <section className={styles.container} aria-label={t('insights.practice.dashboardLabel', 'Practice insights dashboard')}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1>{t('insights.practice.title', 'Practice insights')}</h1>
            <p className={styles.cardSubtitle}>
              {t('insights.practice.subtitle', 'Private performance and operational metrics for your clinical practice.')}
            </p>
          </div>
        </div>

        <div className={styles.privacyBanner} role="status">
          <span aria-hidden="true">🔒</span>
          <span>
            <strong>{t('insights.practice.privacyLabel', 'Doctor privacy guarantee:')}</strong>{' '}
            {t('insights.practice.privacyBody', 'This view is strictly private to your account. No comparisons are made with named peer doctors.')}
          </span>
        </div>

        <DateRangeSelector
          currentPreset={preset}
          startDate={customRange?.startDate}
          endDate={customRange?.endDate}
          onChangePreset={handleRangeChange}
        />
      </header>

      <QueryState
        result={{ isPending, isError, error, data, refetch }}
        loading={<InsightsSkeleton loadingLabel={t('insights.practice.loading', 'Loading practice insights')} />}
        loadingLabel={t('insights.practice.loading', 'Loading practice insights')}
        errorTitle="Practice insights couldn't be loaded"
        onRetry={() => void refetch()}
        isEmpty={isEmptyInsights}
        empty={
          <EmptyState
            size="page"
            title="No appointments in this range"
            description="There are no scheduled visits, referrals or message threads in the selected period. Choose a wider date range to see your practice metrics."
            action={{ label: 'Choose a wider date range', onClick: () => setPreset('90d') }}
          />
        }
      >
        {(insights) => (
          <>
            <UtilisationChart
              weeks={insights.utilisation.weeks}
              overallOfferedSlots={insights.utilisation.overallOfferedSlots}
              overallBookedSlots={insights.utilisation.overallBookedSlots}
              overallUtilisationRate={insights.utilisation.overallUtilisationRate}
              sampleSizeWarning={insights.utilisation.sampleSizeWarning}
            />

            <NoShowMetricsCard metrics={insights.noShows} />

            <TurnaroundMetricsCard
              referrals={insights.referrals}
              messages={insights.messages}
            />
          </>
        )}
      </QueryState>
    </section>
  );
}
