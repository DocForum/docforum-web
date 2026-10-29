import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { PageError } from '../../../components/states/PageError';
import { Skeleton } from '../../../components/states/Skeleton';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { ApiError } from '../../../services/api-client';
import { OrderWalletPayPanel } from '../../payments/components/OrderWalletPayPanel';
import type { PatientOrder, QualifiedOrderFacility } from '../../../types/models';
import { currentOrderVersions } from '../current-orders';
import {
  useMyOrders,
  useQualifiedFacilities,
  useSelectFulfillingFacility,
} from '../hooks/useOrders';
import styles from './OrdersList.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusLabel(order: PatientOrder) {
  if (order.status === 'active') return order.selectedFacility ? 'In fulfillment' : 'Needs a facility';
  if (order.status === 'completed') return 'Completed';
  if (order.status === 'cancelled') return 'Cancelled';
  return 'Superseded';
}

function orderTitle(order: PatientOrder) {
  return order.orderType === 'prescription' ? order.medication : order.testName;
}

function orderDetail(order: PatientOrder) {
  if (order.orderType === 'prescription') {
    return [order.dose, order.quantity].filter(Boolean).join(' · ');
  }
  return order.fastingRequired ? 'Fasting required' : 'No fasting required';
}

interface FacilitySelectionDialogProps {
  order: PatientOrder;
  onClose: () => void;
  onSelected: (order: PatientOrder) => void;
}

function FacilitySelectionDialog({ order, onClose, onSelected }: FacilitySelectionDialogProps) {
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
        setError('This order changed while you were choosing. Close this dialog and try again.');
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Could not select this facility.');
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
        <h2 id="facility-dialog-title">Choose a fulfilling facility</h2>
        <p className={styles.dialogSubtitle}>
          Only facilities qualified to fulfill {orderTitle(order).toLowerCase()} are shown.
        </p>

        {facilities.isLoading ? (
          <Skeleton lines={3} label="Loading qualified facilities" />
        ) : facilities.isError ? (
          <InlineError
            title="Couldn't load qualified facilities"
            message={queryErrorMessage(facilities.error)}
            onRetry={() => void facilities.refetch()}
          />
        ) : facilities.data?.length === 0 ? (
          <EmptyState
            title="No qualified facilities yet"
            description="No pharmacy or lab is currently qualified for this order. Try again later or ask your doctor."
            action={{ label: 'Close', onClick: onClose }}
          />
        ) : null}

        <ul className={styles.facilityList}>
          {facilities.data?.map((facility) => (
            <li key={facility.id} className={styles.facilityItem}>
              <div>
                <strong>{facility.name}</strong>
                <p className={styles.facilityMeta}>
                  {facility.type === 'pharmacy' ? 'Pharmacy' : 'Laboratory'}
                  {facility.location ? ` · ${facility.location.address}, ${facility.location.city}` : ''}
                </p>
                <p className={styles.facilityMeta}>
                  {facility.isOpen ? 'Open now' : 'Closed'} · {facility.capabilities.join(', ')}
                </p>
              </div>
              <Button
                onClick={() => choose(facility)}
                disabled={!facility.isOpen || selectFacility.isPending}
                loading={selectFacility.isPending && selectFacility.variables?.input.facilityId === facility.id}
              >
                Select
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
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrdersList() {
  const orders = useMyOrders();
  const [selecting, setSelecting] = useState<PatientOrder | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);

  if (orders.isLoading) return <Skeleton lines={6} height="1.5rem" label="Loading your orders" />;
  if (orders.isError) {
    return (
      <PageError
        title="Your orders couldn't be loaded"
        message={queryErrorMessage(orders.error)}
        onRetry={() => void orders.refetch()}
        fallback={{ label: 'Back to your care hub', to: '/patient' }}
      />
    );
  }

  const entries = currentOrderVersions(orders.data ?? []);

  return (
    <section className={styles.panel} aria-labelledby="orders-heading">
      <header className={styles.panelHeader}>
        <div>
          <h1 id="orders-heading">Your orders</h1>
          <p className={styles.subtitle}>
            Prescriptions and lab orders, newest first. Select a pharmacy or lab where an order needs one.
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
          title="No prescriptions or lab orders yet"
          description="Orders issued after a consultation appear here, newest first."
          action={{ label: 'Back to your care hub', to: '/patient' }}
        />
      ) : (
        <ul className={styles.list}>
          {entries.map(({ order, history }) => {
            const latestHistory = history[history.length - 1];
            return (
              <li key={order.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.kind}>
                      {order.orderType === 'prescription' ? 'Prescription' : 'Lab order'}
                    </span>
                    <h2 className={styles.title}>{orderTitle(order)}</h2>
                    <p className={styles.meta}>
                      Issued {formatDate(order.issuedAt)}
                      {order.issuedByDoctorName ? ` by ${order.issuedByDoctorName}` : ''}
                    </p>
                  </div>
                  <span className={styles.status} data-status={order.status}>
                    {statusLabel(order)}
                  </span>
                </div>

                <p className={styles.detail}>{orderDetail(order)}</p>
                {order.instructions ? <p className={styles.instructions}>{order.instructions}</p> : null}

                {latestHistory ? (
                  <p className={styles.history}>
                    Version {order.version}. Earlier version {latestHistory.version} is superseded and kept
                    for the record.
                  </p>
                ) : null}

                <div className={styles.facilityRow}>
                  {order.selectedFacility ? (
                    <p className={styles.selectedFacility}>
                      Fulfilling facility: <strong>{order.selectedFacility.name}</strong>
                      {order.selectedFacility.isOpen === false ? ' (currently closed)' : ''}
                    </p>
                  ) : order.requiresFacilitySelection && order.status === 'active' ? (
                    <>
                      <p className={styles.muted}>
                        This order needs a fulfilling facility before it can be processed.
                      </p>
                      <Button onClick={() => setSelecting(order)}>Choose facility</Button>
                    </>
                  ) : (
                    <p className={styles.muted}>No facility selection is needed for this order.</p>
                  )}
                </div>

                {/* Hidden unless the pay-with-wallet flag is on (default off)
                    and docforum-core has an intent for this order. */}
                <OrderWalletPayPanel order={order} />
                <p className={styles.detailLink}>
                  <Link to={`/patient/orders/${order.id}`}>Details & payment status</Link>
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
            setSelectedNotice(`${orderTitle(updated)} will be fulfilled by ${updated.selectedFacility?.name}.`)
          }
        />
      ) : null}
    </section>
  );
}
