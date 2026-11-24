// Session-timeout settings from docforum-core. ASSUMED contract (issue
// #82): no such endpoint exists in docforum-core yet. See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions — Session idle timeout".
//
// The backend knows the session's role, so the call takes no parameters.
// A `404` (endpoint not served yet) or any other failure is expected and
// handled by the caller: the frontend's role-based defaults apply and the
// UI keeps working — the backend value only takes precedence when it is
// actually served.
import { apiFetch } from './api-client';
import type { SessionTimeoutSettings } from '../types/models';

export function getSessionTimeoutSettings(accessToken: string): Promise<SessionTimeoutSettings> {
  return apiFetch<SessionTimeoutSettings>('/auth/session-timeout', { accessToken });
}
