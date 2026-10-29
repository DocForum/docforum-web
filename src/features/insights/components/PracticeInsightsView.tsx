import { useState } from 'react';
import { useDoctorInsights } from '../hooks/useDoctorInsights';
import { DateRangeSelector } from './DateRangeSelector';
import { UtilisationChart } from './UtilisationChart';
import { NoShowMetricsCard } from './NoShowMetricsCard';
import { TurnaroundMetricsCard } from './TurnaroundMetricsCard';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import type { DateRangePreset, DoctorPracticeInsights } from '../../../types/models';
import styles from './PracticeInsights.module.css';

// Fallback initial data when backend is not yet populated
export const DEFAULT_MOCK_INSIGHTS: DoctorPracticeInsights = {
  doctorProfileId: 'doc-me',
  range: {
    preset: '30d',
    startDate: '2026-09-18',
    endDate: '2026-10-18',
  },
  generatedAt: new Date().toISOString(),
  utilisation: {
    weeks: [
      {
        weekLabel: 'Sep 21',
        startDate: '2026-09-21',
        endDate: '2026-09-27',
        offeredSlots: 30,
        bookedSlots: 26,
        completedSlots: 24,
        utilisationRate: 86.7,
      },
      {
        weekLabel: 'Sep 28',
        startDate: '2026-09-28',
        endDate: '2026-10-04',
        offeredSlots: 32,
        bookedSlots: 29,
        completedSlots: 27,
        utilisationRate: 90.6,
      },
      {
        weekLabel: 'Oct 05',
        startDate: '2026-10-05',
        endDate: '2026-10-11',
        offeredSlots: 28,
        bookedSlots: 22,
        completedSlots: 20,
        utilisationRate: 78.6,
      },
      {
        weekLabel: 'Oct 12',
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        offeredSlots: 35,
        bookedSlots: 31,
        completedSlots: 29,
        utilisationRate: 88.6,
      },
    ],
    overallOfferedSlots: 125,
    overallBookedSlots: 108,
    overallUtilisationRate: 86.4,
    sampleSizeWarning: false,
  },
  noShows: {
    totalScheduled: 108,
    completedVisits: 100,
    noShows: 5,
    lateCancellations: 3,
    onTimeCancellations: 6,
    noShowRate: 4.6,
    lateCancelRate: 2.8,
    sampleSizeWarning: false,
  },
  referrals: {
    totalSent: 24,
    totalAccepted: 21,
    totalPending: 3,
    averageAcceptanceHours: 19.4,
    medianAcceptanceHours: 14.0,
    breakdownUnder24h: 15,
    breakdown24to48h: 5,
    breakdownOver48h: 1,
    sampleSizeWarning: false,
  },
  messages: {
    totalThreads: 42,
    averageFirstResponseMinutes: 38,
    medianFirstResponseMinutes: 24,
    respondedWithin2hCount: 36,
    respondedWithin24hCount: 41,
    rateWithin2h: 85.7,
    sampleSizeWarning: false,
  },
};

export function PracticeInsightsView() {
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string } | undefined>();

  const { data, isLoading, isError, error, refetch } = useDoctorInsights({
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

  // Nothing cached yet: outline the metrics that are about to arrive.
  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton lines={6} height="2.75rem" label="Loading practice insights" />
      </div>
    );
  }

  // Gracefully fallback to DEFAULT_MOCK_INSIGHTS when backend endpoint is not yet connected
  const insights: DoctorPracticeInsights = data ?? DEFAULT_MOCK_INSIGHTS;

  return (
    <section className={styles.container} aria-label="Practice insights dashboard">
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <div>
            <h1>Practice insights</h1>
            <p className={styles.cardSubtitle}>
              Private performance and operational metrics for your clinical practice.
            </p>
          </div>
        </div>

        <div className={styles.privacyBanner} role="status">
          <span aria-hidden="true">🔒</span>
          <span>
            <strong>Doctor privacy guarantee:</strong> This view is strictly private to your account. No comparisons are made with named peer doctors.
          </span>
        </div>

        <DateRangeSelector
          currentPreset={preset}
          startDate={customRange?.startDate}
          endDate={customRange?.endDate}
          onChangePreset={handleRangeChange}
        />
      </header>

      {isError && (
        <InlineError
          title="Showing preview data"
          message={queryErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      )}

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
    </section>
  );
}
