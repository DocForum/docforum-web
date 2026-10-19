import { ApiError } from '../../services/api-client';

export interface SaveFailure {
  /**
   * `conflict` — the flag changed (or vanished) since the admin opened it.
   * `rejected` — docforum-core refused this particular change.
   * `unconfirmed` — we never heard back. The change is rolled back on screen
   * and the list refetched, which shows whether it went through after all.
   */
  kind: 'conflict' | 'rejected' | 'auth' | 'unconfirmed';
  message: string;
}

export function describeSaveError(error: unknown, flagKey: string): SaveFailure {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return {
        kind: 'conflict',
        message: `${flagKey} was changed by someone else after you opened it. Your change wasn’t saved — the latest values are shown; review them and try again.`,
      };
    }
    if (error.status === 404) {
      return { kind: 'conflict', message: `${flagKey} no longer exists in this environment. Your change wasn’t saved.` };
    }
    if (error.status === 400 || error.status === 422) {
      return { kind: 'rejected', message: `docforum-core refused the change to ${flagKey}: ${error.message}` };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: 'Your session no longer has admin access. Sign in again with an admin account.' };
    }
  }
  return {
    kind: 'unconfirmed',
    message: `Couldn’t confirm the change to ${flagKey}, so it has been rolled back on screen. The preview backend may be waking up — reloading the current state now.`,
  };
}

export function describeListError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session no longer has admin access. Sign in again with an admin account.';
    }
    if (error.status === 404) {
      return "docforum-core doesn't serve feature flags yet (docforum-core#132).";
    }
  }
  return "Couldn't load feature flags. The preview backend may be waking up — try again in a minute.";
}
