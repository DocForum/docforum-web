// --- PHI access log (#34) ----------------------------------------------------
// assumed — docforum-core#40 (audit log read API) is not landed; these mirror
// the event its write-side middleware already records.

export type AccessActorRole = 'doctor' | 'facility' | 'patient' | 'admin';
export type AccessRecordType = 'health_profile' | 'appointment' | 'referral' | 'order' | 'dependent';
export type AccessReason = 'consultation' | 'order_fulfillment' | 'result_delivery' | 'handover_claim' | 'support';

export interface AccessLogEvent {
  id: string;
  occurredAt: string;
  actorRole: AccessActorRole;
  actorName: string;
  recordType: AccessRecordType;
  reason: AccessReason;
}

export interface AccessLogPage {
  events: AccessLogEvent[];
  nextCursor: string | null;
}
