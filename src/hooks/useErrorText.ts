import { useIntl } from 'react-intl';
import { describeError, supportReference } from '../services/error-catalogue';

export interface ErrorText {
  message: string;
  actionLabel: string | null;
  action: ReturnType<typeof describeError>['action'];
  /** Support reference (backend request id) — shown with unknown errors. */
  reference: string | null;
}

/**
 * Turn a thrown value into display-ready copy, translated and never exposing
 * the raw server message. Returns `null` for "no error".
 */
export function useErrorText() {
  const intl = useIntl();

  return (error: unknown): ErrorText | null => {
    if (!error) return null;
    const descriptor = describeError(error);
    return {
      message: intl.formatMessage({ id: descriptor.messageId, defaultMessage: descriptor.defaultMessage }),
      actionLabel:
        descriptor.actionMessageId && descriptor.defaultActionMessage
          ? intl.formatMessage({
              id: descriptor.actionMessageId,
              defaultMessage: descriptor.defaultActionMessage,
            })
          : null,
      action: descriptor.action,
      reference: supportReference(error),
    };
  };
}

/** Convenience for forms that only need the message string. */
export function useErrorMessage() {
  const errorText = useErrorText();
  return (error: unknown): string | null => {
    const text = errorText(error);
    if (!text) return null;
    return text.reference ? `${text.message} (ref: ${text.reference})` : text.message;
  };
}
