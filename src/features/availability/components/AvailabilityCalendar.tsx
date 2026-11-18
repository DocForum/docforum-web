import { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { FormError } from '../../../components/FormError';
import { Spinner } from '../../../components/Spinner';
import { SlotSelection } from './SlotSelection';
import {
  buildCells,
  formatDayHeading,
  hourLabels,
  slotGrid,
  slotsInTimeRange,
  slotStatusLabel,
  timeRangeOfSlots,
  timeZoneLabel,
} from '../calendar';
import type { SlotTimeRange } from '../calendar';
import type { IsoDate } from '../calendar';
import type { AvailabilitySlot, SlotStatus } from '../../../types/models';
import styles from './AvailabilityCalendar.module.css';

export type AvailabilityAction = 'block' | 'remove' | 'unblock';

interface Props {
  slots: AvailabilitySlot[];
  dates: readonly IsoDate[];
  view: 'week' | 'day';
  timeZone: string;
  selectedSlotIds: readonly string[];
  onSelectionChange: (slotIds: string[]) => void;
  onAction: (action: AvailabilityAction, slotIds: string[], range: SlotTimeRange | null) => void;
  pendingSlotIds?: readonly string[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const STATUS_ORDER: SlotStatus[] = ['open', 'held', 'booked'];

export function AvailabilityCalendar({
  slots,
  dates,
  view,
  timeZone,
  selectedSlotIds,
  onSelectionChange,
  onAction,
  pendingSlotIds = [],
  isLoading,
  error,
  onRetry,
}: Props) {
  const grid = useMemo(() => slotGrid(slots, timeZone), [slots, timeZone]);
  const dayColumns = useMemo(() => buildCells(slots, dates, timeZone, grid), [slots, dates, timeZone, grid]);
  const labels = useMemo(() => dates.map((date) => formatDayHeading(date, view === 'day' ? 'long' : 'short')), [dates, view]);
  const hourTicks = useMemo(() => hourLabels(grid), [grid]);

  const cellsById = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    for (const slot of slots) map.set(slot.id, slot);
    return map;
  }, [slots]);

  const selectedSlots = useMemo(
    () => selectedSlotIds.map((id) => cellsById.get(id)).filter((slot): slot is AvailabilitySlot => Boolean(slot)),
    [selectedSlotIds, cellsById],
  );

  const counts = useMemo(() => {
    const tally: Record<SlotStatus, number> = { open: 0, held: 0, booked: 0 };
    for (const slot of selectedSlots) tally[slot.status] += 1;
    return tally;
  }, [selectedSlots]);

  const range = useMemo(() => timeRangeOfSlots(selectedSlots), [selectedSlots]);

  // Blocking acts on every open slot inside the selection's span, so the button
  // must describe what will actually happen, not just what was dragged.
  const openIdsInSpan = useMemo(
    () => (range ? slotsInTimeRange(slots.filter((slot) => slot.status === 'open'), range).map((slot) => slot.id) : []),
    [range, slots],
  );

  const isPending = pendingSlotIds.length > 0;
  const zone = timeZoneLabel(timeZone);

  return (
    <section className={styles.calendar} aria-label="Availability calendar">
      <header className={styles.header}>
        <p className={styles.zone}>
          <span className={styles.zonePrefix} aria-hidden="true">
            TZ
          </span>
          All times in <strong>{zone}</strong>
        </p>
        <ul className={styles.legend} aria-label="Slot status key">
          {STATUS_ORDER.map((status) => (
            <li key={status} className={`${styles.legendItem} ${styles[status]}`}>
              {slotStatusLabel(status)}
            </li>
          ))}
        </ul>
      </header>

      {error && (
        <div className={styles.errorState}>
          <FormError message={error} />
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      {isLoading && (
        <p className={styles.loading}>
          <Spinner size={18} /> Loading slots in {zone}.
        </p>
      )}

      {!isLoading && !error && dates.length === 0 && <p className={styles.empty}>No dates selected.</p>}

      {!isLoading && !error && dates.length > 0 && slots.length === 0 && (
        <p className={styles.empty}>
          No slots in this window. Generate slots below to open it for booking.
        </p>
      )}

      {!isLoading && !error && dates.length > 0 && slots.length > 0 && (
        <div className={styles.board}>
          <ul
            className={styles.gutter}
            aria-hidden="true"
            style={{ gridTemplateRows: `var(--day-header-height) repeat(${grid.rows}, var(--slot-row-height))` }}
          >
            {hourTicks.map((label) => (
              <li key={label.label} style={{ gridRow: `${label.rowStart + 1} / span ${label.rowSpan}` }}>
                {label.label}
              </li>
            ))}
          </ul>
          <SlotSelection
            dayColumns={dayColumns}
            dayLabels={labels}
            gridRows={grid.rows}
            timeZone={timeZone}
            selectedSlotIds={selectedSlotIds}
            onSelectionChange={onSelectionChange}
            busySlotIds={pendingSlotIds}
            ariaLabel={`Slots, ${view === 'day' ? labels[0] : `week of ${labels[0] ?? ''} to ${labels[labels.length - 1] ?? ''}`}, all times in ${zone}`}
          />
        </div>
      )}

      <div className={styles.actions}>
        <p className={styles.summary} role="status">
          {selectedSlots.length === 0
            ? `No slots selected. ${zone}.`
            : `${selectedSlots.length} selected: ${counts.open} open, ${counts.held} held or blocked, ${counts.booked} booked.`}
        </p>
        <div className={styles.actionButtons}>
          <Button variant="primary" disabled={!range || isPending} onClick={() => onAction('block', openIdsInSpan, range)}>
            Block selected range
          </Button>
          <Button
            variant="secondary"
            disabled={counts.open === 0 || isPending}
            onClick={() => onAction('remove', selectedSlots.filter((slot) => slot.status === 'open').map((slot) => slot.id), range)}
          >
            Remove selected open slots
          </Button>
          <Button
            variant="secondary"
            disabled={counts.held === 0 || isPending}
            onClick={() => onAction('unblock', selectedSlots.filter((slot) => slot.status === 'held').map((slot) => slot.id), range)}
          >
            Unblock selected slots
          </Button>
        </div>
      </div>

      <details className={styles.shortcuts}>
        <summary>Keyboard shortcuts for selecting slots</summary>
        <dl>
          <dt>Tab</dt>
          <dd>Enter or leave the grid — one slot at a time is in the tab order.</dd>
          <dt>Arrow Up / Arrow Down</dt>
          <dd>Previous or next slot within the same day.</dd>
          <dt>Arrow Left / Arrow Right</dt>
          <dd>Same time on the previous or next day (in day view, previous or next slot).</dd>
          <dt>Shift + Arrow</dt>
          <dd>Extend the selection to cover the swept days and times.</dd>
          <dt>Space or Enter</dt>
          <dd>Add or remove the focused slot from the selection.</dd>
          <dt>Home / End</dt>
          <dd>First or last slot of the current day.</dd>
          <dt>Escape</dt>
          <dd>Clear the selection.</dd>
        </dl>
        <p className={styles.dragNote}>
          Dragging with a pointer selects the same rectangular range; every action is also available as a button below the
          grid, so no drag is ever required.
        </p>
      </details>
    </section>
  );
}
