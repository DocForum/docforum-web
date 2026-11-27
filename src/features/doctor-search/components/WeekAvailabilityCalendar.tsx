import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '../../../components/Button';
import { formatDayHeading } from '../../availability/calendar';
import type { AvailabilitySlot } from '../../../types/models';
import {
  buildWeekSlots,
  maxSlotsPerDay,
  nextAvailableAfterWeek,
  slotClockRange,
  slotDayLabel,
} from '../week';
import styles from './WeekAvailabilityCalendar.module.css';

interface Props {
  slots: readonly AvailabilitySlot[];
  weekStart: string;
  timeZone: string;
  doctorName?: string;
  onSelectSlot: (slot: AvailabilitySlot) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

interface Position {
  day: number;
  slot: number;
}

type WeekDays = ReturnType<typeof buildWeekSlots>;

function firstPosition(days: WeekDays): Position | null {
  const day = days.findIndex((entry) => entry.slots.length > 0);
  return day === -1 ? null : { day, slot: 0 };
}

function positionKey(position: Position | null): string {
  return position ? `${position.day}-${position.slot}` : '';
}

function clampPosition(position: Position, days: WeekDays): Position | null {
  const day = days[position.day];
  if (!day || day.slots.length === 0) return null;
  return { day: position.day, slot: Math.min(position.slot, day.slots.length - 1) };
}

function emptySentence(
  slots: readonly AvailabilitySlot[],
  weekStart: string,
  timeZone: string,
): string {
  const next = nextAvailableAfterWeek(slots, weekStart, timeZone);
  if (!next) return 'There are no open times to book right now. Check back soon.';
  return `Next available: ${slotDayLabel(next, timeZone)}, ${slotClockRange(next, timeZone)}.`;
}

/**
 * Week-view availability calendar for the doctor profile (issue #13).
 *
 * A single-slot grid: days are rows, each day's open times are the cells. The
 * grid uses roving tabindex + arrow keys (Right/Left move across days,
 * Down/Up within a day, Home/End jump to the day's first/last slot) and every
 * cell's accessible name carries the full date, the time range and the
 * doctor, so a screen reader user never has to infer a time from its column.
 */
export function WeekAvailabilityCalendar({
  slots,
  weekStart,
  timeZone,
  doctorName,
  onSelectSlot,
  onPreviousWeek,
  onNextWeek,
}: Props) {
  const days = useMemo(
    () => buildWeekSlots(slots, weekStart, timeZone),
    [slots, weekStart, timeZone],
  );
  const rows = maxSlotsPerDay(days);
  const gridRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<Position | null>(() => firstPosition(days));

  // A new week (or a refetched slot list) can leave the old focus position
  // pointing at a cell that no longer exists.
  useEffect(() => {
    setFocus(firstPosition(days));
  }, [days]);

  const tabbable = focus ?? firstPosition(days);
  const rangeId = `availability-tz-${weekStart}`;
  const weekLabel = formatDayHeading(weekStart, 'long');

  function moveFocus(next: Position | null) {
    if (!next) return;
    setFocus(next);
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-day="${next.day}"][data-slot="${next.slot}"]`)
      ?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, position: Position) {
    const key = event.key;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') {
      return;
    }

    const day = days[position.day];
    if (!day) return;

    let next: Position | null = null;
    switch (key) {
      case 'ArrowRight':
        next = position.day < days.length - 1 ? { day: position.day + 1, slot: position.slot } : null;
        break;
      case 'ArrowLeft':
        next = position.day > 0 ? { day: position.day - 1, slot: position.slot } : null;
        break;
      case 'ArrowDown':
        next = position.slot + 1 < day.slots.length ? { day: position.day, slot: position.slot + 1 } : null;
        break;
      case 'ArrowUp':
        next = position.slot > 0 ? { day: position.day, slot: position.slot - 1 } : null;
        break;
      case 'Home':
        next = { day: position.day, slot: 0 };
        break;
      case 'End':
        next = { day: position.day, slot: day.slots.length - 1 };
        break;
    }

    event.preventDefault();
    if (next) moveFocus(clampPosition(next, days));
  }

  return (
    <section className={styles.container} aria-labelledby="availability-heading">
      <div className={styles.nav}>
        <h2 id="availability-heading" className={styles.heading}>
          Open times
        </h2>
        <div className={styles.weekControls}>
          <Button variant="secondary" onClick={onPreviousWeek} aria-label="Previous week">
            ← Previous
          </Button>
          <p className={styles.weekLabel} aria-live="polite">
            Week of {weekLabel}
          </p>
          <Button variant="secondary" onClick={onNextWeek} aria-label="Next week">
            Next →
          </Button>
        </div>
      </div>

      <p id={rangeId} className={styles.timeZoneNote}>
        Times are shown in your time zone: <strong>{timeZone}</strong>.
      </p>

      {rows === 0 ? (
        <div className={styles.empty} role="status">
          <h3 className={styles.emptyHeading}>No openings this week</h3>
          <p className={styles.emptyBody}>{emptySentence(slots, weekStart, timeZone)}</p>
        </div>
      ) : (
        <div
          ref={gridRef}
          role="grid"
          aria-label={`Open appointment times${doctorName ? ` with ${doctorName}` : ''}, week of ${weekLabel}`}
          aria-describedby={rangeId}
          className={styles.grid}
          onKeyDown={(event) => {
            if (tabbable) handleKeyDown(event, tabbable);
          }}
        >
          <div role="row" className={styles.headerRow}>
            {days.map((day) => (
              <div key={day.date} role="columnheader" className={styles.dayHeader}>
                {day.heading}
              </div>
            ))}
          </div>

          {Array.from({ length: rows }, (_, slotIndex) => (
            <div role="row" className={styles.row} key={slotIndex}>
              {days.map((day, dayIndex) => {
                const slot = day.slots[slotIndex];
                if (!slot) {
                  return <div role="gridcell" className={styles.emptyCell} key={day.date} />;
                }
                const isTabbable = positionKey(tabbable) === `${dayIndex}-${slotIndex}`;
                return (
                  <div role="gridcell" className={styles.cell} key={day.date}>
                    <button
                      type="button"
                      data-day={dayIndex}
                      data-slot={slotIndex}
                      tabIndex={isTabbable ? 0 : -1}
                      className={styles.slotButton}
                      onFocus={() => setFocus({ day: dayIndex, slot: slotIndex })}
                      onClick={() => onSelectSlot(slot)}
                      aria-label={`Book ${slotDayLabel(slot, timeZone)} at ${slotClockRange(slot, timeZone)}${
                        doctorName ? ` with ${doctorName}` : ''
                      }`}
                    >
                      {slotClockRange(slot, timeZone)}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
