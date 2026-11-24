import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../services/api-client';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { useT } from '../../../i18n/useT';
import type { OrderItemFulfillment, PatientOrder } from '../../../types/models';
import {
  useEligibleFacilitiesForRemainingItems,
  useRouteRemainingItems,
} from '../hooks/useOrders';
import { FacilityCard } from './FacilityCard';
import styles from './OrderFulfillment.module.css';

interface RemainingItemsFacilityPickerProps {
  order: PatientOrder;
  items: OrderItemFulfillment[];
  onClose: () => void;
  onRouted: (order: PatientOrder) => void;
}

export function RemainingItemsFacilityPicker({
  order,
  items,
  onClose,
  onRouted,
}: RemainingItemsFacilityPickerProps) {
  const t = useT();
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const { data: facilities = [], isLoading, error } = useEligibleFacilitiesForRemainingItems(
    order.id,
    itemIds,
    true,
  );
  const routeMutation = useRouteRemainingItems(order.id);

  const selectedFacility = facilities.find((facility) => facility.id === selectedFacilityId);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRoute = async () => {
    if (!selectedFacility) return;
    setRouteError(null);
    try {
      const updated = await routeMutation.mutateAsync({
        facilityId: selectedFacility.id,
        itemIds,
      });
      onRouted(updated);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRouteError(
          t(
            'orders.picker.routeConflict',
            'One or more items were already dispensed elsewhere. Refresh this order to see the latest quantities.',
          ),
        );
        return;
      }
      setRouteError(t('orders.picker.routeError', 'Could not route the remaining items. Try again shortly.'));
    }
  };

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="remaining-items-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="remaining-items-heading">{t('orders.picker.title', 'Get remaining items elsewhere')}</h2>
            <p className={styles.modalSubtitle}>
              {t('orders.picker.subtitle', 'These are the items still outstanding. Only facilities qualified for them are shown.')}
            </p>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label={t('orders.picker.close', 'Close')}>
            ×
          </button>
        </div>

        <ul className={styles.itemChips} aria-label={t('orders.picker.itemsLabel', 'Items being routed')}>
          {items.map((item) => (
            <li key={item.id} className={styles.itemChip}>
              {t('orders.picker.itemRemaining', '{name} · {quantity} {unit} remaining', {
                name: item.name,
                quantity: item.quantityOutstanding,
                unit: item.unit,
              })}
            </li>
          ))}
        </ul>

        <div className={styles.paymentNote} role="note">
          <strong>{t('orders.picker.paymentLabel', 'Payment:')}</strong> {order.payment?.rule}{' '}
          {t('orders.picker.paymentNote', 'The second facility is paid only for the items it dispenses.')}
        </div>

        <div className={styles.facilityList} aria-busy={isLoading}>
          {isLoading && (
            <div className={styles.loading} role="status">
              <Spinner />
              <span>{t('orders.picker.findingFacilities', 'Finding eligible facilities…')}</span>
            </div>
          )}
          {error && (
            <FormError
              message={
                t('orders.picker.facilitiesError', 'Could not load eligible facilities. Try again shortly.')
              }
            />
          )}
          {!isLoading &&
            !error &&
            facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                isSelected={facility.id === selectedFacilityId}
                onSelect={(selected) => setSelectedFacilityId(selected.id)}
              />
            ))}
          {!isLoading && !error && facilities.length === 0 && (
            <p className={styles.empty}>
              {t('orders.picker.noFacilities', 'No other facility is currently qualified for these items. Try again later.')}
            </p>
          )}
        </div>

        {routeError && <FormError message={routeError} />}

        <div className={styles.modalActions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleRoute}
            loading={routeMutation.isPending}
            disabled={!selectedFacility || isLoading}
          >
            {t('orders.picker.sendItems', 'Send remaining items')}
          </Button>
        </div>
      </div>
    </div>
  );
}
