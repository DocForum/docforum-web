import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { FulfillmentStatusBadge } from '../../../components/FulfillmentStatusBadge';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { PageError } from '../../../components/states/PageError';
import { Skeleton } from '../../../components/states/Skeleton';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { useT, type Translator } from '../../../i18n/useT';
import { ApiError } from '../../../services/api-client';
import { OrderWalletPayPanel } from '../../payments/components/OrderWalletPayPanel';
import type { PatientOrder, QualifiedOrderFacility } from '../../../types/models';
import { currentOrderVersions } from '../current-orders';
import { formatOrderDate, orderItemSummary, orderTypeLabel } from './order-display';
import {
  useMyOrders,
  useQualifiedFacilities,
  useSelectFulfillingFacility,
} from '../hooks/useOrders';
import styles from './OrdersList.module.css';

function statusLabel(order: PatientOrder, t: Translator) {
  if (order.status === 'active') {
    return order.selectedFacility
      ? t('orders.list.status.inFulfillment', 'In fulfillment')
      : t('orders.list.status.needsFacility', 'Needs a facility');
  }
  if (order.status === 'completed') return t('orders.list.status.completed', 'Completed');
  if (order.status === 'cancelled') return t('orders.list.status.cancelled', 'Cancelled');
  return t('orders.list.status.superseded', 'Superseded');
}

function orderTitle(order: PatientOrder) {
  return order.orderType === 'prescription' ? order.medication : order.testName;
}

function orderDetail(order: PatientOrder, t: Translator) {
  if (order.orderType === 'prescription') {
    return [order.dose, order.quantity].filter(Boolean).join(' · ');
  }
  return order.fastingRequired
    ? t('orders.list.fastingRequired', 'Fasting required')
    : t('orders.list.noFasting', 'No fasting required');
}

interface FacilitySelectionDialogProps {
  order: PatientOrder;
  onClose: () => void;
  onSelected: (order: PatientOrder) => void;
}

function FacilitySelectionDialog({ order, onClose, onSelected }: FacilitySelectionDialogProps) {
  const t = useT();
  const facilities = useQualifiedFacilities(order.id);
  const selectFacility = useSelectFulfillingFacility();
  const [error, setError] = useState<string | null>(null);

  const choose = async (facility: QualifiedOrderFacility) => {
    setError(null);
    try {
      const updated = await selectFacility.mutateAsync({
        orderId: order.id,
        input: { facilityId: facility.id, expectedVersion: order.version },
      });
      onSelected(updated);
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(
          t(
            'orders.list.dialog.conflict',
            'This order changed while you were choosing. Close this dialog and try again.',
          ),
        );
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : t('orders.list.dialog.selectFailed', 'Could not select this facility.'),
      );
    }
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="facility-dialog-title"
      >
        <h2 id="facility-dialog-title">
          {t('orders.list.dialog.title', 'Choose a fulfilling facility')}
        </h2>
        <p className={styles.dialogSubtitle}>
          {t(
            'orders.list.dialog.subtitle',
            'Only facilities qualified to fulfill {order} are shown.',
            { order: orderTitle(order).toLowerCase() },
          )}
        </p>

        {facilities.isLoading ? (
          <Skeleton
            lines={3}
            label={t('orders.list.dialog.loadingLabel', 'Loading qualified facilities')}
          />
        ) : facilities.isError ? (
          <InlineError
            title={t('orders.list.dialog.errorTitle', "Couldn't load qualified facilities")}
            message={queryErrorMessage(facilities.error)}
            onRetry={() => void facilities.refetch()}
          />
        ) : facilities.data?.length === 0 ? (
          <EmptyState
            title={t('orders.list.dialog.emptyTitle', 'No qualified facilities yet')}
            description={t(
              'orders.list.dialog.emptyDescription',
              'No pharmacy or lab is currently qualified for this order. Try again later or ask your doctor.',
            )}
            action={{ label: t('orders.list.dialog.close', 'Close'), onClick: onClose }}
          />
        ) : null}

        <ul className={styles.facilityList}>
          {facilities.data?.map((facility) => (
            <li key={facility.id} className={styles.facilityItem}>
              <div>
                <strong>{facility.name}</strong>
                <p className={styles.facilityMeta}>
                  {facility.type === 'pharmacy'
                    ? t('orders.list.dialog.pharmacy', 'Pharmacy')
                    : t('orders.list.dialog.lab', 'Laboratory')}
                  {facility.location ? ` · ${facility.location.address}, ${facility.location.city}` : ''}
                </p>
                <p className={styles.facilityMeta}>
                  {facility.isOpen
                    ? t('orders.list.dialog.openNow', 'Open now')
                    : t('orders.list.dialog.closed', 'Closed')}{' '}
                  · {facility.capabilities.join(', ')}
                </p>
              </div>
              <Button
                onClick={() => choose(facility)}
                disabled={!facility.isOpen || selectFacility.isPending}
                loading={selectFacility.isPending && selectFacility.variables?.input.facilityId === facility.id}
              >
                {t('orders.list.dialog.select', 'Select')}
              </Button>
            </li>
          ))}
        </ul>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={onClose}>
            {t('orders.list.dialog.cancel', 'Cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrdersList() {
  const t = useT();
  const orders = useMyOrders();
  const [selecting, setSelecting] = useState<PatientOrder | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);

  if (orders.isLoading) {
    return (
      <Skeleton
        lines={6}
        height="1.5rem"
        label={t('orders.list.loadingLabel', 'Loading your orders')}
      />
    );
  }
  if (orders.isError) {
    return (
      <PageError
        title={t('orders.list.errorTitle', "Your orders couldn't be loaded")}
        message={queryErrorMessage(orders.error)}
        onRetry={() => void orders.refetch()}
        fallback={{ label: t('orders.list.backToHub', 'Back to your care hub'), to: '/patient' }}
      />
    );
  }

  const entries = currentOrderVersions(orders.data ?? []);

  return (
    <section className={styles.panel} aria-labelledby="orders-heading">
      <header className={styles.panelHeader}>
        <div>
          <h1 id="orders-heading">{t('orders.list.heading', 'Your orders')}</h1>
          <p className={styles.subtitle}>
            {t(
              'orders.list.subtitleNeedsFacility',
              'Prescriptions and lab orders, newest first. Select a pharmacy or lab where an order needs one.',
            )}
          </p>
        </div>
      </header>

      {selectedNotice ? (
        <p className={styles.notice} role="status">
          {selectedNotice}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          title={t('orders.list.emptyTitle', 'No prescriptions or lab orders yet')}
          description={t(
            'orders.list.emptyDescription',
            'Orders issued after a consultation appear here, newest first.',
          )}
          action={{ label: t('orders.list.backToHub', 'Back to your care hub'), to: '/patient' }}
        />
      ) : (
        <ul className={styles.list}>
          {entries.map(({ order, history }) => {
            const latestHistory = history[history.length - 1];
            return (
              <li key={order.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.kind}>{orderTypeLabel(order, t)}</span>
                    <h2 className={styles.title}>{orderTitle(order)}</h2>
                    <p className={styles.meta}>
                      {t('orders.list.issued', 'Issued {date}', {
                        date: formatOrderDate(order.issuedAt),
                      })}
                      {order.issuedByDoctorName
                        ? t('orders.list.issuedBy', ' by {doctor}', {
                            doctor: order.issuedByDoctorName,
                          })
                        : ''}
                    </p>
                  </div>
                  <div className={styles.statusGroup}>
                    <span className={styles.status} data-status={order.status}>
                      {statusLabel(order, t)}
                    </span>
                    <FulfillmentStatusBadge status={order.fulfillmentStatus ?? 'unfulfilled'} />
                  </div>
                </div>

                <p className={styles.detail}>{orderDetail(order, t)}</p>
                <p className={styles.detail}>{orderItemSummary(order, t)}</p>
                {order.expiresAt ? (
                  <p className={styles.meta}>
                    {t('orders.list.expiresOn', 'Expires {date}', {
                      date: formatOrderDate(order.expiresAt),
                    })}
                  </p>
                ) : null}
                {order.instructions ? <p className={styles.instructions}>{order.instructions}</p> : null}

                {latestHistory ? (
                  <p className={styles.history}>
                    {t(
                      'orders.list.versionHistory',
                      'Version {version}. Earlier version {earlier} is superseded and kept for the record.',
                      { version: order.version, earlier: latestHistory.version },
                    )}
                  </p>
                ) : null}

                <div className={styles.facilityRow}>
                  {order.selectedFacility ? (
                    <p className={styles.selectedFacility}>
                      {t('orders.list.fulfillingFacility', 'Fulfilling facility: {facility}', {
                        facility: order.selectedFacility.name,
                      })}
                      {order.selectedFacility.isOpen === false
                        ? t('orders.list.currentlyClosed', ' (currently closed)')
                        : ''}
                    </p>
                  ) : order.requiresFacilitySelection && order.status === 'active' ? (
                    <>
                      <p className={styles.muted}>
                        {t(
                          'orders.list.needsFacility',
                          'This order needs a fulfilling facility before it can be processed.',
                        )}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        {order.catalogItemCode ? (
                          <Link
                            to={`/patient/facilities?catalogItemCode=${encodeURIComponent(order.catalogItemCode)}`}
                            className={styles.compareLink}
                          >
                            {t('orders.list.comparePrices', 'Compare facility prices')}
                          </Link>
                        ) : null}
                        <Button onClick={() => setSelecting(order)}>
                          {t('orders.list.chooseFacility', 'Choose facility')}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className={styles.muted}>
                      {t('orders.list.noFacilityNeeded', 'No facility selection is needed for this order.')}
                    </p>
                  )}
                </div>

                {/* Hidden unless the pay-with-wallet flag is on (default off)
                    and docforum-core has an intent for this order. */}
                <OrderWalletPayPanel order={order} />
                <p className={styles.detailLink}>
                  <Link to={`/patient/orders/${order.id}`}>
                    {t('orders.list.detailsLink', 'Details & payment status')}
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {selecting ? (
        <FacilitySelectionDialog
          order={selecting}
          onClose={() => setSelecting(null)}
          onSelected={(updated) =>
            setSelectedNotice(
              t('orders.list.selectedNotice', '{order} will be fulfilled by {facility}.', {
                order: orderTitle(updated),
                facility: updated.selectedFacility?.name ?? '',
              }),
            )
          }
        />
      ) : null}
    </section>
  );
}
