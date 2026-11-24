import { useState } from 'react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../../test/render';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { BlockConflictNotice } from './BlockConflictNotice';
import { buildWeekDates } from '../calendar';
import type { AvailabilitySlot } from '../../../types/models';

const TIME_ZONE = 'Africa/Lagos';
const ANCHOR = '2026-10-19';
const WEEK = buildWeekDates(ANCHOR);

function slot(
  id: string,
  day: string,
  startHourUtc: number,
  status: AvailabilitySlot['status'],
  appointment?: AvailabilitySlot['appointment'],
): AvailabilitySlot {
  const start = `${day}T${String(startHourUtc).padStart(2, '0')}:00:00.000Z`;
  return {
    id,
    doctorProfileId: 'doctor-1',
    status,
    startTime: start,
    endTime: `${day}T${String(startHourUtc + 1).padStart(2, '0')}:00:00.000Z`,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...(appointment ? { appointment } : {}),
  };
}

const SLOTS: AvailabilitySlot[] = [
  slot('s1', '2026-10-19', 8, 'open'),
  slot('s2', '2026-10-19', 9, 'open'),
  slot('s3', '2026-10-19', 10, 'booked', { id: 'appt-3', status: 'scheduled', patientFullName: 'Ada Obi' }),
  slot('s4', '2026-10-19', 11, 'open'),
  slot('h1', '2026-10-20', 8, 'held'),
];

type CalendarProps = ComponentProps<typeof AvailabilityCalendar>;

function Harness(overrides: Partial<CalendarProps> = {}) {
  const [ids, setIds] = useState<string[]>([]);
  const props: CalendarProps = {
    slots: SLOTS,
    dates: WEEK,
    view: 'week',
    timeZone: TIME_ZONE,
    selectedSlotIds: ids,
    onSelectionChange: setIds,
    onAction: vi.fn(),
    pendingSlotIds: [],
    isLoading: false,
    error: null,
    onRetry: vi.fn(),
    ...overrides,
  };
  return <AvailabilityCalendar {...props} />;
}

describe('AvailabilityCalendar time zone labelling', () => {
  it('states the zone and its offset above the week grid', () => {
    render(<Harness />);
    expect(screen.getByText(/All times in/)).toHaveTextContent('Africa/Lagos (GMT+1)');
  });

  it('keeps the same label in the day view', () => {
    render(<Harness dates={[ANCHOR]} view="day" />);
    expect(screen.getByText(/All times in/)).toHaveTextContent('Africa/Lagos (GMT+1)');
  });

  it('shows slot times in the doctor\'s zone, not UTC', () => {
    render(<Harness />);
    expect(screen.getByRole('gridcell', { name: /Monday 19 October, 09:00-10:00/ })).toBeInTheDocument();
  });
});

describe('AvailabilityCalendar status display', () => {
  it('lists open, blocked and booked in words, not colour alone', () => {
    render(<Harness />);
    const key = screen.getByRole('list', { name: /slot status key/i });
    expect(within(key).getByText('Open')).toBeInTheDocument();
    expect(within(key).getByText('Held or blocked')).toBeInTheDocument();
    expect(within(key).getByText('Booked')).toBeInTheDocument();
  });

  it('carries status into the cells themselves, not only the legend', () => {
    render(<Harness />);
    expect(screen.getAllByText('Held or blocked').length).toBeGreaterThan(1);
  });

  it('shows who a booked slot belongs to', () => {
    render(<Harness />);
    expect(screen.getByRole('gridcell', { name: /booked with Ada Obi/ })).toBeInTheDocument();
  });
});

describe('AvailabilityCalendar states', () => {
  it('says the window has no slots instead of showing a blank grid', () => {
    render(<Harness slots={[]} />);
    expect(screen.getByText(/No slots in this window/i)).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('shows a loading state naming the zone it is loading for', () => {
    render(<Harness isLoading slots={[]} />);
    expect(screen.getByText(/Loading slots in Africa\/Lagos/i)).toBeInTheDocument();
  });

  it('offers a retry when the window could not be loaded', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<Harness error="The availability could not be loaded." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('The availability could not be loaded.');
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('AvailabilityCalendar selection actions', () => {
  it('disables every action until a slot is selected', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /block selected range/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove selected open slots/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /unblock selected slots/i })).toBeDisabled();
  });

  it('enables the block button once a cell is selected from the keyboard', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    await user.keyboard(' ');

    expect(screen.getByRole('button', { name: /block selected range/i })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('1 selected: 1 open');
  });

  it('describes the selection as counts per status', () => {
    render(<Harness selectedSlotIds={['s1', 's3']} />);
    expect(screen.getByText('2 selected: 1 open, 0 held or blocked, 1 booked.')).toBeInTheDocument();
  });

  it('blocks the whole span between the selected cells, not only the cells picked', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<Harness onAction={onAction} />);

    await user.tab();
    await user.keyboard(' {ArrowDown} {ArrowDown} {ArrowDown} ');
    await user.click(screen.getByRole('button', { name: /block selected range/i }));

    expect(onAction).toHaveBeenCalledWith(
      'block',
      ['s1', 's2', 's4'],
      { startTime: '2026-10-19T08:00:00.000Z', endTime: '2026-10-19T12:00:00.000Z' },
    );
  });

  it('offers only the selected open slots for removal', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<Harness onAction={onAction} dates={[ANCHOR]} view="day" />);

    await user.tab();
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}{ArrowDown}{ArrowDown}');
    await user.click(screen.getByRole('button', { name: /remove selected open slots/i }));

    expect(onAction).toHaveBeenCalledWith('remove', ['s1', 's2'], expect.anything());
  });

  it('sends a held slot to the unblock action', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<Harness onAction={onAction} selectedSlotIds={['h1']} dates={['2026-10-20']} view="day" />);

    await user.click(screen.getByRole('button', { name: /unblock selected slots/i }));
    expect(onAction).toHaveBeenCalledWith('unblock', ['h1'], expect.anything());
  });

  it('locks the buttons while a change on the selection is in flight', () => {
    render(<Harness selectedSlotIds={['s1']} pendingSlotIds={['s1']} />);
    expect(screen.getByRole('button', { name: /block selected range/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove selected open slots/i })).toBeDisabled();
  });
});

describe('AvailabilityCalendar discoverability', () => {  it('documents the keyboard alternative to dragging', () => {
    render(<Harness />);
    expect(screen.getByText('Shift + Arrow')).toBeInTheDocument();
    expect(screen.getByText('Space or Enter')).toBeInTheDocument();
    expect(screen.getByText(/no drag is ever required/i)).toBeInTheDocument();
  });

  it('names the grid after the week and the zone it shows', () => {
    render(<Harness />);
    expect(screen.getByRole('grid')).toHaveAccessibleName(/all times in Africa\/Lagos \(GMT\+1\)/);
  });
});

describe('booked appointments inside a blocked range', () => {
  const rangeLabel = 'Monday 19 October, 09:00-13:00';
  const entries = [
    { key: 'appt-3', label: 'Ada Obi', detail: 'still scheduled', time: '11:00-12:00' },
    { key: 'appt-5', label: 'Bola Ade', detail: 'still scheduled', time: '12:00-13:00' },
  ];

  it('shows them by name before the doctor confirms the block', () => {
    render(
      <BlockConflictNotice stage="preview" entries={entries} rangeLabel={rangeLabel} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText('2 booked appointments are inside Monday 19 October, 09:00-13:00')).toBeInTheDocument();
    expect(screen.getByText('Ada Obi')).toBeInTheDocument();
    expect(screen.getByText('Bola Ade')).toBeInTheDocument();
  });

  it('says in words that blocking does not cancel them', () => {
    render(
      <BlockConflictNotice stage="preview" entries={entries} rangeLabel={rangeLabel} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText(/does not cancel the appointments below/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /block the range, keep these appointments/i })).toBeInTheDocument();
  });

  it('makes the doctor confirm rather than blocking on the spot', () => {
    const onConfirm = vi.fn();
    render(
      <BlockConflictNotice stage="preview" entries={entries} rangeLabel={rangeLabel} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    expect(screen.queryByRole('status')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('repeats what the backend reported after the block, as a status message', () => {
    render(<BlockConflictNotice stage="server" entries={entries} rangeLabel={rangeLabel} />);

    expect(screen.getByRole('status')).toHaveTextContent('Left untouched: 2 booked appointments');
    expect(screen.getByText(/cancelled none of them/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stays silent when the range holds no booked appointments', () => {
    const { container } = render(
      <BlockConflictNotice stage="preview" entries={[]} rangeLabel={rangeLabel} onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
