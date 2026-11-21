import type { MessageValues } from '../../i18n/useT';
import type { WebhookEventType } from '../../types/models';

type Translate = (id: string, defaultMessage: string, values?: MessageValues) => string;

/**
 * Webhook event names are API identifiers and stay verbatim in the UI. The
 * description shown alongside a name gives the user the human explanation,
 * translated through the catalogue.
 */
export function webhookEventDescription(t: Translate, event: WebhookEventType): string {
  switch (event) {
    case 'order.created':
      return t('integrations.event.orderCreated', 'An order was created');
    case 'order.assigned':
      return t('integrations.event.orderAssigned', 'An order was assigned to a facility');
    case 'order.fulfilled':
      return t('integrations.event.orderFulfilled', 'An order was fulfilled');
    case 'order.cancelled':
      return t('integrations.event.orderCancelled', 'An order was cancelled');
    case 'payment.released':
      return t('integrations.event.paymentReleased', 'An escrow payment was released');
    case 'payment.refunded':
      return t('integrations.event.paymentRefunded', 'An escrow payment was refunded');
  }
}
