// --- Active sessions and devices (#79) ---------------------------------------
// Mapped from docforum-core's `GET /auth/sessions` in auth-service.ts. Coarse
// device only: the UI never shows the IP address the API returns.

export interface ActiveSession {
  id: string;
  /** Coarse label derived from the user agent, e.g. "iPhone · Safari". */
  device: string;
  /** Coarse city/country, or null when unknown (core doesn't report one yet). */
  approximateLocation: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface RevokeOtherSessionsResult {
  revokedCount: number;
}
