// Client-side CSV export of the facility performance aggregates. Only ever
// serialises the aggregates already on screen — never fetches anything and
// never includes patient-level data (there is none in the model).
import { csvFilename, downloadCsv, escapeCsvCell, type CsvColumn } from '../admin-audit/csv';
import type { FacilityPerformanceInsights } from '../../types/models';

export { csvFilename, downloadCsv };

/** Formats a whole-hours duration as "45m", "3.5h" or "2.1d". */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/** A short human label for a rejection reason code. */
export function rejectionReasonLabel(code: string, fallback?: string): string {
  if (fallback) return fallback;
  return code
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const VALUE_COLUMNS: CsvColumn<FacilityPerformanceInsights>[] = [
  { header: 'turnaround_fulfilled_count', value: (d) => d.turnaround.fulfilledCount },
  { header: 'turnaround_median_hours', value: (d) => d.turnaround.medianHours },
  { header: 'turnaround_p90_hours', value: (d) => d.turnaround.p90Hours },
  { header: 'turnaround_min_hours', value: (d) => d.turnaround.minHours },
  { header: 'turnaround_max_hours', value: (d) => d.turnaround.maxHours },
  { header: 'turnaround_within_1h', value: (d) => d.turnaround.within1h },
  { header: 'turnaround_within_4h', value: (d) => d.turnaround.within4h },
  { header: 'turnaround_within_24h', value: (d) => d.turnaround.within24h },
  { header: 'turnaround_over_24h', value: (d) => d.turnaround.over24h },
  { header: 'disputes_total_orders', value: (d) => d.disputes.totalOrders },
  { header: 'disputes_disputed_orders', value: (d) => d.disputes.disputedOrders },
  { header: 'disputes_dispute_rate', value: (d) => d.disputes.disputeRate },
  { header: 'disputes_open', value: (d) => d.disputes.openDisputes },
  { header: 'disputes_avg_resolution_hours', value: (d) => d.disputes.averageResolutionHours },
];

/** One tidy CSV: a metric column per row value, then per-day and per-reason
 * sections appended below, each introduced by a blank line and a header row.
 * Spreadsheet-friendly and diff-friendly. */
export function facilityInsightsToCsv(insights: FacilityPerformanceInsights): string {
  const lines: string[] = [];

  lines.push('section,metric,value');
  lines.push(escapeCsvCell('range'));
  lines.push(`range,start_date,${escapeCsvCell(insights.range.startDate)}`);
  lines.push(`range,end_date,${escapeCsvCell(insights.range.endDate)}`);
  lines.push(`range,preset,${escapeCsvCell(insights.range.preset)}`);
  for (const column of VALUE_COLUMNS) {
    lines.push(`facility,${escapeCsvCell(column.header)},${escapeCsvCell(column.value(insights))}`);
  }

  lines.push('');
  lines.push('volume_date,received,fulfilled,rejected');
  for (const day of insights.volumeByDay) {
    lines.push(
      [day.date, day.received, day.fulfilled, day.rejected]
        .map((value) => escapeCsvCell(value))
        .join(','),
    );
  }

  lines.push('');
  lines.push('rejection_code,rejection_label,count,percentage');
  for (const reason of insights.rejectionReasons) {
    lines.push(
      [
        reason.code,
        rejectionReasonLabel(reason.code, reason.label),
        reason.count,
        reason.percentage,
      ]
        .map((value) => escapeCsvCell(value))
        .join(','),
    );
  }

  return lines.join('\r\n') + '\r\n';
}
