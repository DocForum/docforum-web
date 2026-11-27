export type AvailableMetricCell = {
  status: 'available';
  value: number;
  numerator?: number;
  denominator: number;
  unit?: 'days';
};

export type SuppressedMetricCell = {
  status: 'suppressed';
  value: null;
  numerator?: null;
  denominator: null;
  unit?: 'days';
};

export type UnavailableMetricCell = {
  status: 'not_yet_available';
  value: null;
};

export type AdminMetricCell =
  | AvailableMetricCell
  | SuppressedMetricCell
  | UnavailableMetricCell;

export interface AdminSuccessMetrics {
  window: { from: string; to: string; timeZone: 'UTC' };
  minimumCellCount: number;
  metrics: {
    noShowRate: AdminMetricCell;
    bookingLeadTimeDays: AdminMetricCell;
    timeFromSymptomToOrder: UnavailableMetricCell;
    referralCompletionRate: UnavailableMetricCell;
    ordersFulfilledWithinNDays: UnavailableMetricCell;
  };
}
