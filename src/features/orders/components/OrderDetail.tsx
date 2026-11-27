import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { ApiError } from '../../../services/api-client';
import { useFormatters } from '../../../i18n/formatters';
import { useT } from '../../../i18n/useT';
import { useOrder } from '../hooks/useOrder';
import { OrderQrCode } from './OrderQrCode';
import { OrderConfirmPanel } from './OrderConfirmPanel';
import type { OrderStatus } from '../../../types/models';
import styles from './OrderDetail.module.css';

/** Colours for each order status; labels come from the active locale. */
const STATUS_META: Record<
  OrderStatus,
  { variant: 'active' | 'warning' | 'danger' | 'muted' }
> = {
  active:     { variant: 'active'  },
  superseded: { variant: 'warning' },
  expired:    { variant: 'danger'  },
  fulfilled:  { variant: 'muted'   },
  cancelled:  { variant: 'danger'  },
};

function orderStatusLabel(status: OrderStatus, t: ReturnType<typeof useT>): string {
  switch (status) {
    case 'active':
      return t('orders.detail.status.active', 'Active');
    case 'superseded':
      return t('orders.detail.status.superseded', 'Superseded');
    case 'expired':
      return t('orders.detail.status.expired', 'Expired');
    case 'fulfilled':
      return t('orders.detail.status.fulfilled', 'Fulfilled');
    case 'cancelled':
      return t('orders.detail.status.cancelled', 'Cancelled');
  }
}

/** Statuses where the QR code must not be shown (per issue #25).
 * fulfilled is included: a completed order must never render a
 * scannable QR even when the server sends a non-null token. */
const INVALID_QR_STATUSES = new Set<OrderStatus>([
  'superseded',
  'expired',
  'cancelled',
  'fulfilled',
]);

interface OrderDetailProps {
  orderId: string;
}

/** Full order detail card — QR code, status, items, print affordance.
 * Handles superseded/expired/fulfilled/cancelled states by hiding the
 * QR and showing a clear message instead. */
export function OrderDetail({ orderId }: OrderDetailProps) {
  const t = useT();
  const { dateTime: formatDateTime } = useFormatters();
  const [fullscreen, setFullscreen] = useState(false);
  const orderQuery = useOrder(orderId);

  /** Ref to the element that opened the overlay — focus is restored here on close. */
  const fullscreenTriggerRef = useRef<HTMLElement | null>(null);
  /** Ref to the close button inside the overlay — receives focus on open. */
  const fullscreenCloseRef = useRef<HTMLButtonElement>(null);

  // Move focus into the overlay when it opens, and restore it when it closes.
  useEffect(() => {
    if (fullscreen) {
      fullscreenCloseRef.current?.focus();
    } else {
      // Only try to restore if the element still exists in the DOM.
      if (fullscreenTriggerRef.current instanceof HTMLElement) {
        fullscreenTriggerRef.current.focus();
      }
    }
  }, [fullscreen]);

  function openFullscreen() {
    // Capture the trigger element before the overlay replaces it in the DOM.
    fullscreenTriggerRef.current = document.activeElement as HTMLElement;
    setFullscreen(true);
  }

  // Close the overlay on Escape.
  useEffect(() => {
    if (!fullscreen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setFullscreen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fullscreen]);

  if (orderQuery.isLoading) {
    return (
      <div className={styles.centred}>
        <Skeleton lines={4} height="1.5rem" label={t('orders.detail.loading', 'Loading order')} />
      </div>
    );
  }

  if (orderQuery.isError) {
    const message =
      orderQuery.error instanceof ApiError && (orderQuery.error.status === 401 || orderQuery.error.status === 403)
        ? t('orders.detail.forbidden', 'Sign in again to view this order.')
        : orderQuery.error instanceof ApiError && orderQuery.error.status === 404
          ? t('orders.detail.notFoundBody', "This order doesn't exist, or it isn't one of yours. Check the link, or ask the clinic that issued it.")
          : t('orders.detail.loadError', 'Could not load this order. Try again shortly.');
    return (
      <InlineError
          title={t('orders.detail.errorTitle', "Your order couldn't be loaded")}
        message={message}
        onRetry={() => void orderQuery.refetch()}
          retryLabel={t('common.tryAgain', 'Try again')}
      />
    );
  }

  const order = orderQuery.data;
  if (!order) return null;

  const meta = STATUS_META[order.status];
  const statusLabel = orderStatusLabel(order.status, t);
  const qrInvalid = INVALID_QR_STATUSES.has(order.status) || !order.token;

  /** True only when the order is active but the token hasn't arrived yet. */
  const tokenPending = order.status === 'active' && !order.token;

  const formattedDate = formatDateTime(order.issuedAt);

  const formattedExpiry = order.expiresAt
    ? formatDateTime(order.expiresAt)
    : null;

  return (
    <>
      {/* Full-screen QR overlay (screen only) */}
      {fullscreen && order.token && (
        <div
          className={styles.fullscreenOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={t('orders.detail.fullscreenQrDialog', 'Full-screen QR code')}
        >
          <button
            ref={fullscreenCloseRef}
            type="button"
            className={styles.fullscreenClose}
            onClick={() => setFullscreen(false)}
            aria-label={t('orders.detail.closeFullscreenQr', 'Close full-screen QR')}
          >
            ✕
          </button>
          <div className={styles.fullscreenHint}>
            {t('orders.detail.brightnessTip', 'Brightness tip: increase your screen brightness for the best scan result.')}
          </div>
          <OrderQrCode token={order.token} size={360} />
        </div>
      )}

      <article className={styles.card} data-testid="order-detail">
        {/* Header */}
        <header className={styles.header}>
          <div>
            <span className={styles.typeLabel}>
              {order.type === 'lab_order'
                ? t('orders.detail.labOrder', 'Lab order')
                : t('orders.detail.prescription', 'Prescription')}
            </span>
            <h2 className={styles.title}>Order #{order.id.slice(-8).toUpperCase()}</h2>
          </div>
          <span
            className={styles.statusPill}
            data-variant={meta.variant}
            aria-label={t('orders.detail.statusLabel', 'Status: {status}', { status: statusLabel })}
          >
            {statusLabel}
          </span>
        </header>

        {/* QR section */}
        <section className={styles.qrSection} aria-label={t('orders.detail.qrSection', 'QR code section')}>
          {tokenPending ? (
            <div className={styles.qrInvalid} role="status" data-testid="qr-pending-banner">
              <strong>{t('orders.detail.codePendingTitle', 'Code not available yet.')}</strong>
              <p>{t('orders.detail.codePendingBody', "This order's code isn't available yet. Check back shortly or contact your doctor.")}</p>
            </div>
          ) : qrInvalid ? (
            <div className={styles.qrInvalid} role="alert" data-testid="qr-invalid-banner">
              {order.status === 'superseded' && (
                <>
                  <strong>{t('orders.detail.supersededTitle', 'This order has been superseded.')}</strong>
                  <p>{t('orders.detail.supersededBody', 'A newer version of this order exists. Ask your doctor for the updated order.')}</p>
                </>
              )}
              {order.status === 'expired' && (
                <>
                  <strong>{t('orders.detail.expiredTitle', 'This order has expired.')}</strong>
                  <p>{t('orders.detail.expiredBody', 'The validity window has passed. Contact your doctor to reissue it.')}</p>
                </>
              )}
              {order.status === 'cancelled' && (
                <>
                  <strong>{t('orders.detail.cancelledTitle', 'This order has been cancelled.')}</strong>
                  <p>{t('orders.detail.cancelledBody', 'This order is no longer valid.')}</p>
                </>
              )}
              {order.status === 'fulfilled' && (
                <>
                  <strong>{t('orders.detail.fulfilledTitle', 'This order has already been fulfilled.')}</strong>
                  <p>{t('orders.detail.fulfilledBody', 'The facility marked this order as completed.')}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <OrderQrCode token={order.token!} size={240} />
              <p className={styles.qrHint}>
                {t('orders.detail.qrHint', 'Show this QR at the facility — it encodes a signed verification token. For the best scan, maximise your screen brightness.')}
              </p>
              <Button
                variant="secondary"
                className={`${styles.fullscreenBtn} no-print`}
                onClick={openFullscreen}
                aria-label={t('orders.detail.openFullscreenQr', 'Open full-screen QR')}
              >
                {t('orders.detail.fullscreenQr', 'Full-screen QR')}
              </Button>
            </>
          )}
        </section>

        {/* Order meta */}
        <section className={styles.meta}>
          <dl className={styles.metaList}>
            <dt>{t('orders.detail.issued', 'Issued')}</dt>
            <dd>{formattedDate}</dd>
            {formattedExpiry && (
              <>
                <dt>{t('orders.detail.expires', 'Expires')}</dt>
                <dd>{formattedExpiry}</dd>
              </>
            )}
            <dt>{t('orders.detail.doctor', 'Doctor')}</dt>
            <dd>{order.doctorName}</dd>
            {order.facilityName && (
              <>
                <dt>{t('orders.detail.facility', 'Facility')}</dt>
                <dd>{order.facilityName}</dd>
              </>
            )}
          </dl>
        </section>

        {/* Items */}
        {order.items.length > 0 && (
          <section className={styles.itemsSection}>
            <h3 className={styles.itemsHeading}>
              {order.type === 'lab_order'
                ? t('orders.detail.tests', 'Tests')
                : t('orders.detail.medications', 'Medications')}
            </h3>
            <ul className={styles.itemsList}>
              {order.items.map((item, i) => (
                <li key={i} className={styles.item}>
                  <span className={styles.itemName}>{item.name}</span>
                  {item.note && <span className={styles.itemNote}>{item.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Print button — hidden in print stylesheet */}
        <div className={`${styles.actions} no-print`}>
          <Button
            variant="secondary"
            onClick={() => window.print()}
            aria-label={t('orders.detail.printLabel', 'Print or save as PDF')}
          >
            {t('orders.detail.print', 'Print / Save as PDF')}
          </Button>
        </div>

        {/* Confirm receipt / report problem panel for fulfilled orders (issue #35) */}
        {order.status === 'fulfilled' && order.confirmationWindow && (
          <OrderConfirmPanel
            orderId={order.id}
            updatedAt={order.updatedAt}
            confirmationWindow={order.confirmationWindow}
          />
        )}
      </article>
    </>
  );
}
