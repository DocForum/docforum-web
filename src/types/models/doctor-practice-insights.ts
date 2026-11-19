// --- Phase W3 — Doctor Practice Insights (issue #50, depends on docforum-core#124) ---

export type DateRangePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date YYYY-MM-DD
}

export interface UtilisationWeek {
  weekLabel: string;
  startDate: string;
  endDate: string;
  offeredSlots: number;
  bookedSlots: number;
  completedSlots: number;
  utilisationRate: number; // percentage 0-100
}

export interface NoShowMetrics {
  totalScheduled: number;
  completedVisits: number;
  noShows: number;
  lateCancellations: number;
  onTimeCancellations: number;
  noShowRate: number;        // percentage
  lateCancelRate: number;    // percentage
  sampleSizeWarning: boolean;
}

export interface ReferralTurnaroundMetrics {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  averageAcceptanceHours: number;
  medianAcceptanceHours: number;
  breakdownUnder24h: number;
  breakdown24to48h: number;
  breakdownOver48h: number;
  sampleSizeWarning: boolean;
}

export interface MessageResponseMetrics {
  totalThreads: number;
  averageFirstResponseMinutes: number;
  medianFirstResponseMinutes: number;
  respondedWithin2hCount: number;
  respondedWithin24hCount: number;
  rateWithin2h: number;
  sampleSizeWarning: boolean;
}

export interface DoctorPracticeInsights {
  doctorProfileId: string;
  range: DateRange;
  generatedAt: string;
  utilisation: {
    weeks: UtilisationWeek[];
    overallOfferedSlots: number;
    overallBookedSlots: number;
    overallUtilisationRate: number;
    sampleSizeWarning: boolean;
  };
  noShows: NoShowMetrics;
  referrals: ReferralTurnaroundMetrics;
  messages: MessageResponseMetrics;
}
