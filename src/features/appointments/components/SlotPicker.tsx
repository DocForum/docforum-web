import type { AvailabilitySlot } from '../../../types/models';
import { Spinner } from '../../../components/Spinner';
import { formatSlotRange, groupSlotsByDay } from '../slots';
import styles from './SlotPicker.module.css';

interface SlotPickerProps {
  slots: AvailabilitySlot[];
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Times for one doctor, grouped by local day. A button per slot with
 * `aria-pressed` (not a bare clickable div) and an accessible name that
 * includes the day, so a screen-reader user hears "which day" without having
 * to track the group heading. The caller has already removed the patient's
 * current slot — moving to the same time is not a reschedule.
 */
export function SlotPicker({
  slots,
  selectedSlotId,
  onSelect,
  isLoading = false,
  disabled = false,
}: SlotPickerProps) {
  const groups = groupSlotsByDay(slots);

  if (isLoading && slots.length === 0) {
    return (
      <p className={styles.state} aria-busy="true">
        <Spinner size={14} /> Checking which times are open…
      </p>
    );
  }

  if (groups.length === 0) {
    return (
      <p className={styles.state}>
        No other times are open with this clinician right now. New times show up as soon as your clinician adds them —
        you keep your current appointment either way.
      </p>
    );
  }

  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <section key={group.dayKey} className={styles.day} aria-label={group.dayLabel}>
          <h4 className={styles.dayLabel}>{group.dayLabel}</h4>
          <ul className={styles.slots}>
            {group.slots.map((slot) => {
              const range = formatSlotRange(slot);
              const pressed = slot.id === selectedSlotId;
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    className={pressed ? `${styles.slot} ${styles.selected}` : styles.slot}
                    aria-pressed={pressed}
                    aria-label={`${group.dayLabel}, ${range}`}
                    disabled={disabled}
                    onClick={() => onSelect(slot.id)}
                  >
                    {range}
                    {pressed && <span className={styles.tick} aria-hidden="true">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {isLoading && (
        <p className={styles.refreshing} role="status">
          <Spinner size={14} /> Refreshing times…
        </p>
      )}
    </div>
  );
}
