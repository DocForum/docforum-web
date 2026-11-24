import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/render';
import { WeekAvailabilityCalendar } from './WeekAvailabilityCalendar';
import type { AvailabilitySlot } from '../../../types/models';

const TIME_ZONE = 'UTC';
const WEEK_START = '2026-10-19';

function slot(id: string, day: string, startHour: number, endHour: number): AvailabilitySlot {
  return {
    id,
    doctorProfileId: 'doctor-1',
    status: 'open',
    startTime: `${day}T${String(startHour).padStart(2, '0')}:00:00.000Z`,
    endTime: `${day}T${String(endHour).padStart(2, '0')}:00:00.000Z`,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const SLOTS = [
  slot('mon-1', '2026-10-19', 9, 10),
  slot('mon-2', '2026-10-19', 11, 12),
  slot('tue-1', '2026-10-20', 14, 15),
];

function Harness({ slots = SLOTS, weekStart = WEEK_START }: { slots?: AvailabilitySlot[]; weekStart?: string }) {
  return (
    <WeekAvailabilityCalendar
      slots={slots}
      weekStart={weekStart}
      timeZone={TIME_ZONE}
      doctorName="Dr. Ada Example"
      onSelectSlot={vi.fn()}
      onPreviousWeek={vi.fn()}
      onNextWeek={vi.fn()}
    />
  );
}

describe('WeekAvailabilityCalendar', () => {
  it('renders a grid with a column per day and accessible slot names', () => {
    render(<Harness />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(
      screen.getByRole('button', { name: /Book Monday 19 October at 09:00-10:00 with Dr. Ada Example/i }),
    ).toBeInTheDocument();
  });

  it('states the time zone above the grid', () => {
    render(<Harness />);
    expect(screen.getByText(/Times are shown in your time zone/i)).toHaveTextContent('UTC');
  });

  it('keeps exactly one slot in the tab order', () => {
    render(<Harness />);
    const tabbable = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('data-day') && button.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  });

  it('moves across days with ArrowRight and back with ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /Monday 19 October at 09:00-10:00/i }));
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Monday 19 October/);

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Tuesday 20 October/);

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Monday 19 October/);
  });

  it('moves down the times of one day with ArrowDown', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /Monday 19 October at 09:00-10:00/i }));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Monday 19 October at 11:00-12:00/);
  });

  it('explains an empty week and gives the next available time', () => {
    render(
      <Harness
        weekStart="2026-10-26"
        slots={[slot('later', '2026-11-03', 10, 11)]}
      />,
    );

    expect(screen.getByText(/No openings this week/i)).toBeInTheDocument();
    expect(screen.getByText(/Next available:/i)).toHaveTextContent('Tuesday 3 November');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });
});
