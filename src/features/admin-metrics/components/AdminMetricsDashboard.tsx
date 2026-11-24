import { useState, type FormEvent } from 'react';
import { useAdminMetrics } from '../hooks/useAdminMetrics';
import { defaultMetricsDates, metricsWindowFromDates } from '../date-range';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import styles from './AdminMetricsDashboard.module.css';
import type { AdminMetricCell, AdminSuccessMetrics } from '../../../types/models';

type MetricKey = keyof AdminSuccessMetrics['metrics'];

const definitions: Record<MetricKey, { title: string; definition: string; unit: 'percent' | 'days' }> = {
  noShowRate: {
    title: 'Patient no-show rate',
    definition: 'Appointments marked no-show divided by completed or no-show appointments scheduled in this range.',
    unit: 'percent',
  },
  bookingLeadTimeDays: {
    title: 'Booking lead time',
    definition: 'Mean days between booking creation and the scheduled appointment, for completed or no-show visits.',
    unit: 'days',
  },
  timeFromSymptomToOrder: {
    title: 'Symptom to order',
    definition: 'Time from a patient opening the app with a symptom to receiving a prescription or lab order.',
    unit: 'days',
  },
  referralCompletionRate: {
    title: 'Referral completion',
    definition: 'Share of referrals that reach completed status. The approved cohort and window are not instrumented yet.',
    unit: 'percent',
  },
  ordersFulfilledWithinNDays: {
    title: 'Orders fulfilled within N days',
    definition: 'Share of issued orders fulfilled within the agreed N-day window.',
    unit: 'percent',
  },
};

function metricValue(cell: AdminMetricCell, unit: 'percent' | 'days'): string {
  if (cell.status !== 'available') return '—';
  return unit === 'percent'
    ? new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(cell.value)
    : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(cell.value)} days`;
}

function MetricCard({
  metricKey,
  cell,
  minimumCellCount,
  from,
  to,
}: {
  metricKey: MetricKey;
  cell: AdminMetricCell;
  minimumCellCount: number;
  from: string;
  to: string;
}) {
  const definition = definitions[metricKey];
  const value = metricValue(cell, definition.unit);
  const isRatio = definition.unit === 'percent';

  return (
    <article className={styles.card}>
      <h2>{definition.title}</h2>
      <p className={styles.definition}>{definition.definition}</p>
      {cell.status === 'not_yet_available' ? (
        <p className={styles.unavailable} role="status">Not yet available</p>
      ) : cell.status === 'suppressed' ? (
        <p className={styles.suppressed} role="status">
          Suppressed — fewer than {minimumCellCount} eligible appointments. The underlying count is hidden to protect privacy.
        </p>
      ) : (
        <>
          <figure className={styles.chart}>
            <figcaption>{value} during the selected date range</figcaption>
            <div
              className={styles.barTrack}
              role="img"
              aria-label={`${definition.title}: ${value}.`}
            >
              <span
                className={styles.bar}
                style={{ width: `${isRatio ? Math.max(0, Math.min(1, cell.value)) * 100 : 100}%` }}
              />
            </div>
            {isRatio && <div className={styles.axis} aria-hidden="true"><span>0%</span><span>100%</span></div>}
          </figure>
          <table className={styles.table}>
            <caption className="sr-only">{definition.title} data for the selected range</caption>
            <thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Eligible records</th></tr></thead>
            <tbody>
              <tr>
                <th scope="row">{definition.title}</th>
                <td>{value}</td>
                <td>{cell.denominator}</td>
              </tr>
              <tr>
                <th scope="row">Date range</th>
                <td colSpan={2}>{from} – {to}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </article>
  );
}

export function AdminMetricsDashboard() {
  const initialDates = defaultMetricsDates();
  const [fromDate, setFromDate] = useState(initialDates.from);
  const [throughDate, setThroughDate] = useState(initialDates.through);
  const [appliedDates, setAppliedDates] = useState(initialDates);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const window = metricsWindowFromDates(appliedDates.from, appliedDates.through);
  const query = useAdminMetrics(window.from, window.to);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      metricsWindowFromDates(fromDate, throughDate);
      setAppliedDates({ from: fromDate, through: throughDate });
      setRangeError(null);
    } catch (error) {
      setRangeError(error instanceof Error ? error.message : 'Choose a valid date range.');
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Success metrics</h1>
        <p>Operational measures from PRD §10. These are aggregate service metrics, not clinical outcome claims.</p>
      </header>
      <form className={styles.range} onSubmit={applyRange}>
        <label>
          From
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>
          Through
          <input type="date" value={throughDate} onChange={(event) => setThroughDate(event.target.value)} />
        </label>
        <button type="submit">Apply date range</button>
        <p className={styles.timeZone}>
          Day boundaries use {window.timeZone}; the API aggregates the resulting instants in UTC.
        </p>
      </form>
      {rangeError && <p className={styles.rangeError} role="alert">{rangeError}</p>}
      {query.isLoading && <Skeleton lines={5} label="Loading success metrics" />}
      {query.isError && (
        <InlineError
          title="Success metrics could not be loaded"
          message="The dashboard could not retrieve the selected date range."
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && (
        <div className={styles.grid}>
          {(Object.keys(definitions) as MetricKey[]).map((metricKey) => (
            <MetricCard
              key={metricKey}
              metricKey={metricKey}
              cell={query.data.metrics[metricKey]}
              minimumCellCount={query.data.minimumCellCount}
              from={appliedDates.from}
              to={appliedDates.through}
            />
          ))}
        </div>
      )}
    </div>
  );
}
