import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { formatClockRange, slotStatusLabel } from '../calendar';
import type { SlotCell } from '../calendar';
import type { SlotStatus } from '../../../types/models';
import styles from './SlotSelection.module.css';

interface CellPosition {
  day: number;
  cell: number;
}

interface Rectangle {
  fromDay: number;
  toDay: number;
  fromCell: number;
  toCell: number;
}

/** Cells between two positions, inclusive — the shape both drag and
 * Shift+Arrow produce, so the two paths can never disagree. */
function rectangleBetween(a: CellPosition, b: CellPosition): Rectangle {
  return {
    fromDay: Math.min(a.day, b.day),
    toDay: Math.max(a.day, b.day),
    fromCell: Math.min(a.cell, b.cell),
    toCell: Math.max(a.cell, b.cell),
  };
}

function slotIdsInRectangle(dayColumns: readonly SlotCell[][], rect: Rectangle): string[] {
  const ids: string[] = [];
  for (let day = rect.fromDay; day <= rect.toDay; day += 1) {
    const column = dayColumns[day];
    if (!column) continue;
    for (let cell = rect.fromCell; cell <= rect.toCell; cell += 1) {
      const slot = column[cell];
      if (slot) ids.push(slot.slotId);
    }
  }
  return ids;
}

/** Patterns as well as colour: hatched means blocked, solid means booked, so
 * status survives greyscale. */
const STATUS_PATTERN: Record<SlotStatus, string> = {
  open: '·',
  held: '//',
  booked: '■',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function findCell(grid: RefObject<HTMLDivElement | null>, position: CellPosition): HTMLElement | null {
  return grid.current?.querySelector<HTMLElement>(`[data-day="${position.day}"][data-cell="${position.cell}"]`) ?? null;
}

export interface SlotSelectionProps {
  /** One entry per day, cells in chronological order: days are grid rows in the
   * DOM and columns on screen. */
  dayColumns: readonly SlotCell[][];
  dayLabels: readonly string[];
  gridRows: number;
  timeZone: string;
  selectedSlotIds: readonly string[];
  onSelectionChange: (slotIds: string[]) => void;
  ariaLabel: string;
  /** Slots whose mutation is in flight — announced rather than hidden. */
  busySlotIds?: readonly string[];
}

export function SlotSelection({
  dayColumns,
  dayLabels,
  gridRows,
  timeZone,
  selectedSlotIds,
  onSelectionChange,
  ariaLabel,
  busySlotIds = [],
}: SlotSelectionProps) {
  const [focused, setFocused] = useState<CellPosition | null>(null);
  const [anchor, setAnchor] = useState<CellPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const scrollNextFocus = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => new Set(selectedSlotIds), [selectedSlotIds]);
  const busy = useMemo(() => new Set(busySlotIds), [busySlotIds]);
  const singleDay = dayColumns.length === 1;

  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
    return () => {
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };
  }, [dragging]);

  // A window change can leave the focus position pointing at a cell that is no
  // longer there.
  useEffect(() => {
    setFocused((current) => {
      if (!current) return null;
      const column = dayColumns[current.day];
      if (!column) return dayColumns.some((entry) => entry.length > 0) ? { day: 0, cell: 0 } : null;
      if (!column[current.cell]) return { day: current.day, cell: Math.max(0, column.length - 1) };
      return current;
    });
  }, [dayColumns]);

  const moveFocusTo = useCallback((position: CellPosition) => {
    const element = findCell(gridRef, position);
    if (!element) return;
    scrollNextFocus.current = true;
    element.focus();
  }, []);

  /** Left/Right walk the day axis, Up/Down walk the hours inside a day; in the
   * day view there is only one day, so both axes step through its slots. */
  const step = useCallback(
    (deltaDay: number, deltaCell: number): CellPosition | null => {
      const current = focused ?? { day: 0, cell: 0 };
      const day = clamp(current.day + deltaDay, 0, dayColumns.length - 1);
      const column = dayColumns[day] ?? [];
      if (column.length === 0) return null;
      return { day, cell: clamp(current.cell + deltaCell, 0, column.length - 1) };
    },
    [focused, dayColumns],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keySteps: Partial<Record<string, CellPosition>> = {
      ArrowRight: { day: singleDay ? 0 : 1, cell: singleDay ? 1 : 0 },
      ArrowLeft: { day: singleDay ? 0 : -1, cell: singleDay ? -1 : 0 },
      ArrowDown: { day: 0, cell: 1 },
      ArrowUp: { day: 0, cell: -1 },
    };

    const shift = keySteps[event.key];
    if (shift) {
      event.preventDefault();
      const next = step(shift.day, shift.cell);
      if (!next) return;
      if (event.shiftKey) {
        const base = anchor ?? focused ?? next;
        // Keep the first anchor so repeated Shift+Arrow extends the same range
        // instead of creeping one cell at a time.
        if (!anchor) setAnchor(base);
        onSelectionChange(slotIdsInRectangle(dayColumns, rectangleBetween(base, next)));
      } else {
        setAnchor(next);
      }
      moveFocusTo(next);
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const cell = focused ? dayColumns[focused.day]?.[focused.cell] : undefined;
      if (!cell) return;
      const next = new Set(selected);
      if (next.has(cell.slotId)) next.delete(cell.slotId);
      else next.add(cell.slotId);
      onSelectionChange([...next]);
      setAnchor(focused);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const day = focused?.day ?? 0;
      const column = dayColumns[day] ?? [];
      if (column.length === 0) return;
      const next = { day, cell: event.key === 'Home' ? 0 : column.length - 1 };
      setAnchor(next);
      moveFocusTo(next);
      return;
    }

    if (event.key === 'Escape' && selected.size > 0) {
      event.preventDefault();
      onSelectionChange([]);
      setAnchor(null);
    }
  };

  const beginDrag = (position: CellPosition) => {
    const cell = dayColumns[position.day]?.[position.cell];
    if (!cell) return;
    setDragging(true);
    setAnchor(position);
    onSelectionChange([cell.slotId]);
  };

  const extendDrag = (position: CellPosition) => {
    if (!dragging || !anchor) return;
    onSelectionChange(slotIdsInRectangle(dayColumns, rectangleBetween(anchor, position)));
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={ariaLabel}
      className={styles.grid}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        // Only forget the selection anchor when focus really leaves the grid —
        // otherwise Shift+Arrow loses its base between cells.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setAnchor(null);
      }}
    >
      {dayColumns.map((column, dayIndex) => (
        <div
          key={`${dayLabels[dayIndex]}-${dayIndex}`}
          role="row"
          aria-label={dayLabels[dayIndex]}
          className={styles.dayColumn}
          style={{ gridTemplateRows: `var(--day-header-height) repeat(${gridRows}, var(--slot-row-height))` }}
        >
          <span role="rowheader" className={styles.dayHeader}>
            {dayLabels[dayIndex]}
          </span>
          {column.map((cell, cellIndex) => {
            const isSelected = selected.has(cell.slotId);
            const isFocused = focused?.day === dayIndex && focused?.cell === cellIndex;
            const tabbable = isFocused || (focused === null && dayIndex === 0 && cellIndex === 0);
            return (
              <div
                key={cell.slotId}
                role="gridcell"
                aria-label={cell.accessibleName}
                aria-selected={isSelected}
                aria-busy={busy.has(cell.slotId)}
                className={[styles.cell, styles[cell.status], isSelected ? styles.selected : '']
                  .filter(Boolean)
                  .join(' ')}
                style={{ gridRow: `${cell.rowStart + 1} / span ${cell.rowSpan}` }}
                data-day={dayIndex}
                data-cell={cellIndex}
                tabIndex={tabbable ? 0 : -1}
                onFocus={() => {
                  setFocused({ day: dayIndex, cell: cellIndex });
                  if (scrollNextFocus.current) {
                    findCell(gridRef, { day: dayIndex, cell: cellIndex })?.scrollIntoView({
                      block: 'nearest',
                      inline: 'nearest',
                    });
                    scrollNextFocus.current = false;
                  }
                }}
                onPointerDown={() => beginDrag({ day: dayIndex, cell: cellIndex })}
                onPointerEnter={() => extendDrag({ day: dayIndex, cell: cellIndex })}
              >
                <span className={styles.cellTime}>{formatClockRange(cell.startTime, cell.endTime, timeZone)}</span>
                <span className={styles.cellStatus}>
                  <span className={styles.cellPattern} aria-hidden="true">
                    {STATUS_PATTERN[cell.status]}
                  </span>
                  {slotStatusLabel(cell.status)}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
