import { useState } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import { useOrder } from '../hooks/useOrder';
import { OrderQrCode } from './OrderQrCode';
import type { OrderStatus } from '../../../types/models';
import styles from './OrderDetail.module.css';

/** Human-readable labels and colours for each order status. */
const STATUS_META: Record<
  OrderStatus,
  { label: string; variant: 'active' | 'warning' | 'danger' | 'muted' }
> = {
  active:     { label: 'Active',     variant: 'active'  },
  superseded: { label: 'Superseded', variant: 'warning' },
  expired:    { label: 'Expired',    variant: 'danger'  },
  fulfilled:  { label: 'Fulfilled',  variant: 'muted'   },
  cancelled:  { label: 'Cancelled',  variant: 'danger'  },
};

/** Statuses where the QR code must not be shown (per issue #25). */
const INVALID_QR_STATUSES = new Set<OrderStatus>(['superseded', 'expired', 'cancelled']);

interface OrderDetailProps {
  orderId: string;
}

/** Full order detail card — QR code, status, items, print affordance.
 * Handles superseded/expired states by hiding the QR and showing a clear
 * message instead. */
export function OrderDetail({ orderId }: OrderDetailProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const orderQuery = useOrder(orderId);

  if (orderQuery.isLoading) {
    return (
      <div className={styles.centred} aria-label="Loading order…">
        <Spinner />
      </div>
    );
  }

  if (orderQuery.isError) {
    const message =
      orderQuery.error instanceof ApiError
        ? orderQuery.error.message
        : 'Could not load this order.';
    return <FormError message={message} />;
  }

  const order = orderQuery.data;
  if (!order) return null;

  const meta = STATUS_META[order.status];
  const qrInvalid = INVALID_QR_STATUSES.has(order.status) || !order.token;

  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(order.issuedAt));

  const formattedExpiry = order.expiresAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(order.expiresAt),
      )
    : null;

  return (
    <>
      {/* Full-screen QR overlay (screen only) */}
      {fullscreen && order.token && (
        <div className={styles.fullscreenOverlay} role="dialog" aria-label="Full-screen QR code">
          <button
            type="button"
            className={styles.fullscreenClose}
            onClick={() => setFullscreen(false)}
            aria-label="Close full-screen QR"
          >
            ✕
          </button>
          <div className={styles.fullscreenHint}>
            Brightness tip: increase your screen brightness for the best scan result.
          </div>
          <OrderQrCode token={order.token} size={360} />
        </div>
      )}

      <article className={styles.card} data-testid="order-detail">
        {/* Header */}
        <header className={styles.header}>
          <div>
            <span className={styles.typeLabel}>
              {order.type === 'lab_order' ? 'Lab order' : 'Prescription'}
            </span>
            <h2 className={styles.title}>Order #{order.id.slice(-8).toUpperCase()}</h2>
          </div>
          <span
            className={styles.statusPill}
            data-variant={meta.variant}
            aria-label={`Status: ${meta.label}`}
          >
            {meta.label}
          </span>
        </header>

        {/* QR section */}
        <section className={styles.qrSection} aria-label="QR code section">
          {qrInvalid ? (
            <div className={styles.qrInvalid} role="alert" data-testid="qr-invalid-banner">
              {order.status === 'superseded' && (
                <>
                  <strong>This order has been superseded.</strong>
                  <p>A newer version of this order exists. Ask your doctor for the updated order.</p>
                </>
              )}
              {order.status === 'expired' && (
                <>
                  <strong>This order has expired.</strong>
                  <p>The validity window has passed. Contact your doctor to reissue it.</p>
                </>
              )}
              {order.status === 'cancelled' && (
                <>
                  <strong>This order has been cancelled.</strong>
                  <p>This order is no longer valid.</p>
                </>
              )}
              {order.status === 'fulfilled' && (
                <>
                  <strong>This order has already been fulfilled.</strong>
                  <p>The facility marked this order as completed.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <OrderQrCode token={order.token!} size={240} />
              <p className={styles.qrHint}>
                Show this QR at the facility — it encodes a signed verification token.
                For the best scan, maximise your screen brightness.
              </p>
              <Button
                variant="secondary"
                className={`${styles.fullscreenBtn} no-print`}
                onClick={() => setFullscreen(true)}
                aria-label="Open full-screen QR"
              >
                Full-screen QR
              </Button>
            </>
          )}
        </section>

        {/* Order meta */}
        <section className={styles.meta}>
          <dl className={styles.metaList}>
            <dt>Issued</dt>
            <dd>{formattedDate}</dd>
            {formattedExpiry && (
              <>
                <dt>Expires</dt>
                <dd>{formattedExpiry}</dd>
              </>
            )}
            <dt>Doctor</dt>
            <dd>{order.doctorName}</dd>
            {order.facilityName && (
              <>
                <dt>Facility</dt>
                <dd>{order.facilityName}</dd>
              </>
            )}
          </dl>
        </section>

        {/* Items */}
        {order.items.length > 0 && (
          <section className={styles.itemsSection}>
            <h3 className={styles.itemsHeading}>
              {order.type === 'lab_order' ? 'Tests' : 'Medications'}
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
          <Button variant="secondary" onClick={() => window.print()} aria-label="Print or save as PDF">
            Print / Save as PDF
          </Button>
        </div>
      </article>
    </>
  );
}
