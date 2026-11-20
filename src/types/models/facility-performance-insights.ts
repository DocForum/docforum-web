import type { DateRange } from './doctor-practice-insights';

// --- Phase W4 — Facility Performance Insights (issue #57, assumed aggregate
// endpoint in docforum-core; see ARCHITECTURE_ESSENTIALS.md "Known assumptions")
// ---------------------------------------------------------------------------
// Deliberately aggregate-only: no patient identifiers, names or per-order rows
// ever reach this model. Reviewer must confirm.

export interface FacilityTurnaroundMetrics {
  /** Orders fulfilled in the period (denominator for the rates below). */
  fulfilledCount: number;
  /** Median time from assignment/receipt to fulfilment, in hours. */
  medianHours: number;
  /** 90th-percentile assignment → fulfilment time, in hours. */
  p90Hours: number;
  /** Fastest / slowest fulfilled order, in hours (context for the median). */
  minHours: number;
  maxHours: number;
  /** Fulfilled within each SLA bucket. */
  within1h: number;
  within4h: number;
  within24h: number;
  over24h: number;
  sampleSizeWarning: boolean;
}

export interface FacilityVolumeDay {
  date: string; // ISO date YYYY-MM-DD
  received: number;
  fulfilled: number;
  rejected: number;
}

export interface FacilityRejectionReason {
  /** Stable machine reason code, e.g. 'out_of_stock'. */
  code: string;
  /** Human-readable label for the code. */
  label: string;
  count: number;
  /** Share of all rejections in the period, 0-100. */
  percentage: number;
}

export interface FacilityDisputeMetrics {
  /** Payment intents for orders fulfilled in the period. */
  totalOrders: number;
  disputedOrders: number;
  /** Disputes per 100 orders, 0-100. */
  disputeRate: number;
  resolvedInFacilityFavour: number;
  resolvedInPatientFavour: number;
  /** Still open at period end. */
  openDisputes: number;
  averageResolutionHours: number;
  sampleSizeWarning: boolean;
}

export interface FacilityPerformanceInsights {
  facilityId: string;
  range: DateRange;
  generatedAt: string;
  turnaround: FacilityTurnaroundMetrics;
  volumeByDay: FacilityVolumeDay[];
  rejectionReasons: FacilityRejectionReason[];
  disputes: FacilityDisputeMetrics;
}
