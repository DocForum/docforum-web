import { ApiError } from '../../services/api-client';
import type { Translator } from '../../i18n/useT';
import { englishTranslator } from '../../i18n/englishTranslator';

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

export function describeSaveError(error: unknown, flagKey: string, t: Translator = englishTranslator): SaveFailure {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return {
        kind: 'conflict',
        message: t('adminFlags.error.conflict', '{key} was changed by someone else after you opened it. Your change was not saved — the latest values are shown; review them and try again.', { key: flagKey }),
      };
    }
    if (error.status === 404) {
      return { kind: 'conflict', message: t('adminFlags.error.gone', '{key} no longer exists in this environment. Your change was not saved.', { key: flagKey }) };
    }
    if (error.status === 400 || error.status === 422) {
      return { kind: 'rejected', message: t('adminFlags.error.rejected', 'docforum-core refused the change to {key}: {reason}', { key: flagKey, reason: error.message }) };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: t('adminFlags.error.adminSession', 'Your session no longer has admin access. Sign in again with an admin account.') };
    }
  }
  return {
    kind: 'unconfirmed',
    message: t('adminFlags.error.unconfirmed', 'Couldn’t confirm the change to {key}, so it has been rolled back on screen. The preview backend may be waking up — reloading the current state now.', { key: flagKey }),
  };
}

export function describeListError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('adminFlags.error.adminSession', 'Your session no longer has admin access. Sign in again with an admin account.');
    }
    if (error.status === 404) {
      return t('adminFlags.error.unavailable', "docforum-core doesn't serve feature flags yet (docforum-core#132).");
    }
  }
  return t('adminFlags.error.load', 'Could not load feature flags. The preview backend may be waking up — try again in a minute.');
}
