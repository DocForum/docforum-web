// --- Care thread timeline (Phase W2, issue #28) ------------------------------

export type CareStepType = 'appointment' | 'consultation' | 'referral' | 'order' | 'fulfillment' | 'payment';
export type CareStepStatus = 'completed' | 'in_progress' | 'action_required' | 'pending' | 'skipped';

export interface CareThreadStep {
  id: string;
  stepType: CareStepType;
  title: string;
  description: string;
  status: CareStepStatus;
  timestamp?: string | null;
  actionLabel?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CareThread {
  id: string;
  patientProfileId: string;
  title: string;
  doctorName: string;
  specialty: string;
  startedAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'cancelled';
  steps: CareThreadStep[];
}
