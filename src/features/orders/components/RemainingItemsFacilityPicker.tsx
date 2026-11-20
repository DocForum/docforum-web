import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../services/api-client';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import type { OrderItemFulfillment, PatientOrder } from '../../../types/models';
import {
  useEligibleFacilitiesForRemainingItems,
  useRouteRemainingItems,
} from '../hooks/useOrders';
import { FacilityCard } from './FacilityCard';
import styles from './PatientOrders.module.css';

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
          'One or more items were already dispensed elsewhere. Refresh this order to see the latest quantities.',
        );
        return;
      }
      setRouteError(
        err instanceof Error ? err.message : 'Could not route the remaining items. Try again.',
      );
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
            <h2 id="remaining-items-heading">Get remaining items elsewhere</h2>
            <p className={styles.modalSubtitle}>
              These are the items still outstanding. Only facilities qualified for them are shown.
            </p>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <ul className={styles.itemChips} aria-label="Items being routed">
          {items.map((item) => (
            <li key={item.id} className={styles.itemChip}>
              {item.name} · {item.quantityOutstanding} {item.unit} remaining
            </li>
          ))}
        </ul>

        <div className={styles.paymentNote} role="note">
          <strong>Payment:</strong> {order.payment?.rule} The second facility is paid only for the
          items it dispenses.
        </div>

        <div className={styles.facilityList} aria-busy={isLoading}>
          {isLoading && (
            <div className={styles.loading} role="status">
              <Spinner />
              <span>Finding eligible facilities…</span>
            </div>
          )}
          {error && (
            <FormError
              message={
                error instanceof Error ? error.message : 'Could not load eligible facilities.'
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
              No other facility is currently qualified for these items. Try again later.
            </p>
          )}
        </div>

        {routeError && <FormError message={routeError} />}

        <div className={styles.modalActions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRoute}
            loading={routeMutation.isPending}
            disabled={!selectedFacility || isLoading}
          >
            Send remaining items
          </Button>
        </div>
      </div>
    </div>
  );
}
