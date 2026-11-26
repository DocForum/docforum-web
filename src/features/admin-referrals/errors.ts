import { ApiError } from '../../services/api-client';
import { englishTranslator } from '../../i18n/englishTranslator';
import type { Translator } from '../../i18n/useT';

export type ReferralAction = 'reassign' | 'cancel';

export interface ActionFailure {
  /**
   * `conflict` — someone else got there first (or the referral is no longer
   * pending): the dialog closes and the queue refetches.
   * `rejected` — docforum-core refused this particular request; the admin
   * can change it and resubmit.
   * `unconfirmed` — we never heard back. Retrying is safe: the request
   * carries `expectedUpdatedAt`, so a duplicate comes back as a conflict.
   */
  kind: 'conflict' | 'rejected' | 'auth' | 'unconfirmed';
  message: string;
}

const NOUN_IDS: Record<ReferralAction, { id: 'reassign' | 'cancel'; noun: string }> = {
  reassign: { id: 'reassign', noun: 'reassignment' },
  cancel: { id: 'cancel', noun: 'cancellation' },
};

/** The noun is part of the sentence, so it is translated too — never
 * interpolated as an English word into a Spanish message. */
function nounFor(action: ReferralAction, t: Translator): string {
  const { id, noun } = NOUN_IDS[action];
  return t(`adminReferrals.errors.noun.${id}`, noun);
}

export function describeActionError(
  error: unknown,
  action: ReferralAction,
  t: Translator = englishTranslator,
): ActionFailure {
  const { id } = NOUN_IDS[action];
  const noun = nounFor(action, t);
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 404) {
      return {
        kind: 'conflict',
        message: t(
          'adminReferrals.errors.conflict',
          'This referral changed while you were working on it — another admin, the doctor or the patient acted on it ' +
            'first. Nothing was changed by you; the queue has been refreshed.',
        ),
      };
    }
    if (error.status === 400 || error.status === 422) {
      return {
        kind: 'rejected',
        message: t('adminReferrals.errors.rejected', 'docforum-core refused the {noun}: {message}', {
          noun,
          message: error.message,
        }),
      };
    }
    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message: t('adminReferrals.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.') };
    }
  }
  return {
    kind: 'unconfirmed',
    message: t(
      `adminReferrals.errors.unconfirmed.${id}`,
      "Couldn't confirm the {noun} — the preview backend may be waking up. Try again; if the first attempt went through you'll be told, it won't be applied twice.",
      { noun },
    ),
  };
}

export function describeQueueError(error: unknown, t: Translator = englishTranslator): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('adminReferrals.errors.auth', 'Your session no longer has admin access. Sign in again with an admin account.');
    }
    if (error.status === 404) {
      return t(
        'adminReferrals.errors.notServed',
        "docforum-core doesn't serve the stuck-referral queue yet (docforum-core#68).",
      );
    }
  }
  return t(
    'adminReferrals.errors.queueLoad',
    "Couldn't load stuck referrals. The preview backend may be waking up — try again in a minute.",
  );
}
