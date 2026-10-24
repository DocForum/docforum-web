import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../../test/render';
import { SlotSelection } from './SlotSelection';
import { buildCells, formatDayHeading, slotGrid } from '../calendar';
import type { SlotCell } from '../calendar';
import type { AvailabilitySlot } from '../../../types/models';

const TIME_ZONE = 'UTC';
const DATES = ['2026-10-19', '2026-10-20'];
const MONDAY = 'Monday 19 October';
const TUESDAY = 'Tuesday 20 October';

function slot(id: string, start: string, end: string, status: AvailabilitySlot['status']): AvailabilitySlot {
  return {
    id,
    doctorProfileId: 'doctor-1',
    status,
    startTime: start,
    endTime: end,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const SLOTS: AvailabilitySlot[] = [
  slot('mon-0900', '2026-10-19T09:00:00.000Z', '2026-10-19T09:30:00.000Z', 'open'),
  slot('mon-0930', '2026-10-19T09:30:00.000Z', '2026-10-19T10:00:00.000Z', 'open'),
  slot('mon-1000', '2026-10-19T10:00:00.000Z', '2026-10-19T10:30:00.000Z', 'booked'),
  slot('tue-0900', '2026-10-20T09:00:00.000Z', '2026-10-20T09:30:00.000Z', 'held'),
];

const GRID = slotGrid(SLOTS, TIME_ZONE);
const COLUMNS: SlotCell[][] = buildCells(SLOTS, DATES, TIME_ZONE, GRID);
const LABELS = DATES.map((date) => formatDayHeading(date));

function cellByTime(day: string, time: string): HTMLElement {
  return screen.getByRole('gridcell', { name: new RegExp(`${day}, ${time}`) });
}

function selectedTimes(): string[] {
  return screen
    .getAllByRole('gridcell')
    .filter((element) => element.getAttribute('aria-selected') === 'true')
    .map((element) => (element.getAttribute('aria-label') ?? '').split(',')[1]?.trim() ?? '');
}

function activeTime(): string {
  return (document.activeElement?.getAttribute('aria-label') ?? '').split(', ').slice(1, 2).join(', ');
}

function Harness() {
  const [ids, setIds] = useState<string[]>([]);
  return (
    <SlotSelection
      dayColumns={COLUMNS}
      dayLabels={LABELS}
      gridRows={GRID.rows}
      timeZone={TIME_ZONE}
      selectedSlotIds={ids}
      onSelectionChange={setIds}
      ariaLabel="Slots, week of Mon 19 Oct"
    />
  );
}

function Standalone({ onChange, busy = [] }: { onChange: (ids: string[]) => void; busy?: string[] }) {
  return (
    <SlotSelection
      dayColumns={COLUMNS}
      dayLabels={LABELS}
      gridRows={GRID.rows}
      timeZone={TIME_ZONE}
      selectedSlotIds={[]}
      busySlotIds={busy}
      onSelectionChange={onChange}
      ariaLabel="Slots, week of Mon 19 Oct"
    />
  );
}

describe('SlotSelection with a keyboard', () => {
  it('names every cell with its day, time and status', () => {
    render(<Harness />);
    expect(cellByTime(MONDAY, '09:00-09:30')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: new RegExp(`${TUESDAY}, 09:00-09:30, Held or blocked`) })).toBeInTheDocument();
  });

  it('keeps exactly one cell in the tab order', () => {
    render(<Harness />);
    const tabbable = screen.getAllByRole('gridcell').filter((element) => element.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toBe(cellByTime(MONDAY, '09:00-09:30'));
  });

  it('walks down the hours of a day with ArrowDown and back with ArrowUp', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(activeTime()).toBe('09:00-09:30');

    await user.keyboard('{ArrowDown}');
    expect(activeTime()).toBe('09:30-10:00');

    await user.keyboard('{ArrowUp}');
    expect(activeTime()).toBe('09:00-09:30');
  });

  it('moves to the same time on the next day with ArrowRight and back with ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.getAttribute('aria-label') ?? '').toContain(TUESDAY);

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.getAttribute('aria-label') ?? '').toContain(MONDAY);
  });

  it('extends the selection with Shift+Arrow while keeping the anchor', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(selectedTimes()).toEqual(['09:00-09:30', '09:30-10:00']);

    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(selectedTimes()).toEqual(['09:00-09:30', '09:30-10:00', '10:00-10:30']);
  });

  it('toggles the focused cell with Space and Enter instead of a drag', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard(' ');
    expect(selectedTimes()).toEqual(['09:00-09:30']);

    await user.keyboard('{ArrowDown} ');
    expect(selectedTimes()).toEqual(['09:00-09:30', '09:30-10:00']);

    await user.keyboard('{Enter}');
    expect(selectedTimes()).toEqual(['09:00-09:30']);
  });

  it('jumps to the first and last slot of the day with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard('{End}');
    expect(activeTime()).toBe('10:00-10:30');

    await user.keyboard('{Home}');
    expect(activeTime()).toBe('09:00-09:30');
  });

  it('clears the selection with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(selectedTimes()).toHaveLength(2);

    await user.keyboard('{Escape}');
    expect(selectedTimes()).toHaveLength(0);
  });

  it('reports a keyboard selection as slot ids, so no drag is needed to act', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Standalone onChange={onChange} />);

    await user.tab();
    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(['mon-0900']);
  });

  it('steps the selection across two days in one drag-shaped rectangle', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Standalone onChange={onChange} />);

    await user.tab();
    await user.keyboard('{ArrowRight}');
    onChange.mockClear();
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(onChange).toHaveBeenCalledWith(['mon-0900', 'tue-0900']);
  });
});

describe('SlotSelection with a pointer', () => {
  it('selects a rectangular range by dragging across cells', () => {
    render(<Harness />);

    fireEvent.pointerDown(cellByTime(MONDAY, '09:00-09:30'));
    fireEvent.pointerEnter(cellByTime(MONDAY, '10:00-10:30'));
    fireEvent.pointerUp(document.body);

    expect(selectedTimes()).toEqual(['09:00-09:30', '09:30-10:00', '10:00-10:30']);
  });

  it('starts a fresh selection on each press', () => {
    const onChange = vi.fn();
    render(<Standalone onChange={onChange} />);

    fireEvent.pointerDown(cellByTime(MONDAY, '09:30-10:00'));
    expect(onChange).toHaveBeenCalledWith(['mon-0930']);
  });

  it('marks a cell as busy while its change is in flight', () => {
    render(<Standalone onChange={() => undefined} busy={['mon-0900']} />);

    expect(cellByTime(MONDAY, '09:00-09:30')).toHaveAttribute('aria-busy', 'true');
    expect(cellByTime(MONDAY, '09:30-10:00')).toHaveAttribute('aria-busy', 'false');
  });

  it('labels the grid with the window it is showing', () => {
    render(<Harness />);
    expect(screen.getByRole('grid')).toHaveAccessibleName('Slots, week of Mon 19 Oct');
  });
});
