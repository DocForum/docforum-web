import { useEffect, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '../../../components/Button';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useT } from '../../../i18n/useT';
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
  const t = useT();
  const locale = useIntl().locale;
  const grid = useMemo(() => slotGrid(slots, timeZone), [slots, timeZone]);
  const dayColumns = useMemo(
    () => buildCells(slots, dates, timeZone, grid, t, locale),
    [slots, dates, timeZone, grid, t, locale],
  );
  const labels = useMemo(
    () => dates.map((date) => formatDayHeading(date, view === 'day' ? 'long' : 'short', locale)),
    [dates, view, locale],
  );
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

  const sectionRef = useRef<HTMLElement>(null);
  const lastAction = useRef<{ ids: readonly string[]; index: number } | null>(null);

  // The action buttons stay put, but they are disabled the moment the
  // selection they act on is cleared (and the slots themselves are replaced),
  // so focus can drop to <body>. After the slot list settles, move focus to
  // the slot that was acted on, else the slot that took its place, else the
  // calendar itself: never `<body>` (WCAG 2.4.3, issue #245).
  useEffect(() => {
    const request = lastAction.current;
    if (!request) return;
    lastAction.current = null;

    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && active.isConnected && !active.hasAttribute('disabled')) {
      return;
    }

    const cells = Array.from(
      sectionRef.current?.querySelectorAll<HTMLElement>('[data-slot-id]') ?? [],
    );
    const byId = new Map(cells.map((cell) => [cell.getAttribute('data-slot-id'), cell]));
    const actedOn = request.ids.map((id) => byId.get(id)).find(Boolean);
    const replacement = cells[Math.min(request.index, cells.length - 1)];
    (actedOn ?? replacement ?? sectionRef.current)?.focus();
  }, [slots]);

  const handleAction = (
    action: AvailabilityAction,
    slotIds: string[],
    range: SlotTimeRange | null,
  ) => {
    lastAction.current = {
      ids: slotIds,
      index: Math.max(0, slots.findIndex((slot) => slot.id === slotIds[0])),
    };
    onAction(action, slotIds, range);
  };

  const scope =
    view === 'day'
      ? t('availability.calendar.scopeDay', '{day}', { day: labels[0] ?? '' })
      : t('availability.calendar.scopeWeek', 'week of {from} to {to}', {
          from: labels[0] ?? '',
          to: labels[labels.length - 1] ?? '',
        });

  return (
    <section
      ref={sectionRef}
      className={styles.calendar}
      aria-label={t('availability.calendar.ariaLabel', 'Availability calendar')}
      tabIndex={-1}
    >
      <header className={styles.header}>
        <p className={styles.zone}>
          <span className={styles.zonePrefix} aria-hidden="true">
            TZ
          </span>
          {t('availability.calendar.allTimes', 'All times in')} <strong>{zone}</strong>
        </p>
        <ul className={styles.legend} aria-label={t('availability.calendar.statusKey', 'Slot status key')}>
          {STATUS_ORDER.map((status) => (
            <li key={status} className={`${styles.legendItem} ${styles[status]}`}>
              {slotStatusLabel(status, t)}
            </li>
          ))}
        </ul>
      </header>

      {error && (
        <div className={styles.errorState}>
          <InlineError title="Slots couldn't be loaded" message={error} onRetry={onRetry} />
        </div>
      )}

      {isLoading && (
        <Skeleton
          lines={3}
          label={t('availability.calendar.loading', 'Loading slots in {zone}.', { zone })}
        />
      )}

      {!isLoading && !error && dates.length === 0 && (
        <p className={styles.empty}>{t('availability.calendar.noDates', 'No dates selected.')}</p>
      )}

      {!isLoading && !error && dates.length > 0 && slots.length === 0 && (
        <p className={styles.empty}>
          {t(
            'availability.calendar.noSlots',
            'No slots in this window. Generate slots below to open it for booking.',
          )}
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
            ariaLabel={t('availability.calendar.gridAria', 'Slots, {scope}, all times in {zone}', { scope, zone })}
          />
        </div>
      )}

      <div className={styles.actions}>
        <p className={styles.summary} role="status">
          {selectedSlots.length === 0
            ? t('availability.summary.none', 'No slots selected. {zone}.', { zone })
            : t(
                'availability.summary.selection',
                '{count, plural, one {# selected:} other {# selected:}} {open, plural, one {# open} other {# open}}, {held, plural, one {# held or blocked} other {# held or blocked}}, {booked, plural, one {# booked} other {# booked}}.',
                { count: selectedSlots.length, open: counts.open, held: counts.held, booked: counts.booked },
              )}
        </p>
        <div className={styles.actionButtons}>
          <Button variant="primary" disabled={!range || isPending} onClick={() => handleAction('block', openIdsInSpan, range)}>
            {t('availability.action.block', 'Block selected range')}
          </Button>
          <Button
            variant="secondary"
            disabled={counts.open === 0 || isPending}
            onClick={() => handleAction('remove', selectedSlots.filter((slot) => slot.status === 'open').map((slot) => slot.id), range)}
          >
            {t('availability.action.remove', 'Remove selected open slots')}
          </Button>
          <Button
            variant="secondary"
            disabled={counts.held === 0 || isPending}
            onClick={() => handleAction('unblock', selectedSlots.filter((slot) => slot.status === 'held').map((slot) => slot.id), range)}
          >
            {t('availability.action.unblock', 'Unblock selected slots')}
          </Button>
        </div>
      </div>

      <details className={styles.shortcuts}>
        <summary>{t('availability.shortcuts.title', 'Keyboard shortcuts for selecting slots')}</summary>
        <dl>
          <dt>{t('availability.shortcuts.tab', 'Tab')}</dt>
          <dd>
            {t(
              'availability.shortcuts.tabHint',
              'Enter or leave the grid — one slot at a time is in the tab order.',
            )}
          </dd>
          <dt>{t('availability.shortcuts.arrowsVertical', 'Arrow Up / Arrow Down')}</dt>
          <dd>{t('availability.shortcuts.arrowsVerticalHint', 'Previous or next slot within the same day.')}</dd>
          <dt>{t('availability.shortcuts.arrowsHorizontal', 'Arrow Left / Arrow Right')}</dt>
          <dd>
            {t(
              'availability.shortcuts.arrowsHorizontalHint',
              'Same time on the previous or next day (in day view, previous or next slot).',
            )}
          </dd>
          <dt>{t('availability.shortcuts.shiftArrow', 'Shift + Arrow')}</dt>
          <dd>{t('availability.shortcuts.shiftArrowHint', 'Extend the selection to cover the swept days and times.')}</dd>
          <dt>{t('availability.shortcuts.spaceEnter', 'Space or Enter')}</dt>
          <dd>{t('availability.shortcuts.spaceEnterHint', 'Add or remove the focused slot from the selection.')}</dd>
          <dt>{t('availability.shortcuts.homeEnd', 'Home / End')}</dt>
          <dd>{t('availability.shortcuts.homeEndHint', 'First or last slot of the current day.')}</dd>
          <dt>{t('availability.shortcuts.escape', 'Escape')}</dt>
          <dd>{t('availability.shortcuts.escapeHint', 'Clear the selection.')}</dd>
        </dl>
        <p className={styles.dragNote}>
          {t(
            'availability.shortcuts.dragNote',
            'Dragging with a pointer selects the same rectangular range; every action is also available as a button below the grid, so no drag is ever required.',
          )}
        </p>
      </details>
    </section>
  );
}
