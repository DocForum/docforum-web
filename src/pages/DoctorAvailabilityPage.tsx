import { useEffect, useMemo, useState } from 'react';
import { AvailabilityCalendar } from '../features/availability/components/AvailabilityCalendar';
import { BlockConflictNotice } from '../features/availability/components/BlockConflictNotice';
import { GenerateSlotsForm } from '../features/availability/components/GenerateSlotsForm';
import { useAvailabilitySlots, useMyDoctorProfile } from '../features/availability/hooks/useAvailabilitySlots';
import {
  rollbackMessage,
  useBlockSlotRange,
  useRemoveSlots,
  useUnblockSlot,
} from '../features/availability/hooks/useSlotManagement';
import type { AvailabilityAction } from '../features/availability/components/AvailabilityCalendar';
import type { ConflictEntry } from '../features/availability/components/BlockConflictNotice';
import {
  addDays,
  appointmentStatusLabel,
  buildWeekDates,
  formatClockRange,
  formatDayHeading,
  slotsInTimeRange,
  systemTimeZone,
  todayInZone,
} from '../features/availability/calendar';
import type { IsoDate, SlotTimeRange } from '../features/availability/calendar';
import { ApiError } from '../services/api-client';
import { Button } from '../components/Button';
import type { AvailabilitySlot, SlotAppointment } from '../types/models';

interface PendingBlock {
  range: SlotTimeRange;
  entries: ConflictEntry[];
}

const PAGE_STYLE = {
  width: '100%',
  maxWidth: '1180px',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-4)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-6)',
} as const;

const ROW_STYLE = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' } as const;
const GROUP_STYLE = { display: 'flex', gap: 'var(--space-2)' } as const;

/** A blocked slot's booked neighbour, described in terms the doctor can act on. */
function bookedSlotEntry(slot: AvailabilitySlot, timeZone: string): ConflictEntry {
  return {
    key: slot.id,
    label: slot.appointment?.patientFullName ?? 'Booked appointment',
    detail: appointmentStatusLabel(slot.appointment?.status ?? 'scheduled'),
    time: formatClockRange(slot.startTime, slot.endTime, timeZone),
  };
}

function conflictEntry(appointment: SlotAppointment): ConflictEntry {
  return {
    key: appointment.id,
    label: appointment.patientFullName ?? 'Booked appointment',
    detail: appointmentStatusLabel(appointment.status),
  };
}

function readErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.message.trim()) return error.message.trim();
  return 'The availability could not be loaded.';
}

export function DoctorAvailabilityPage() {
  const [timeZone] = useState(systemTimeZone);
  const [anchorDate, setAnchorDate] = useState<IsoDate>(() => todayInZone(new Date(), timeZone));
  const [view, setView] = useState<'week' | 'day'>('week');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingBlock, setPendingBlock] = useState<PendingBlock | null>(null);
  const [blockedRange, setBlockedRange] = useState<SlotTimeRange | null>(null);
  const [serverConflicts, setServerConflicts] = useState<SlotAppointment[]>([]);
  const [rollbackNotice, setRollbackNotice] = useState<string | null>(null);

  const profileQuery = useMyDoctorProfile();
  const doctorProfileId = profileQuery.data?.id ?? null;

  const dates = useMemo(
    () => (view === 'week' ? buildWeekDates(anchorDate) : [anchorDate]),
    [view, anchorDate],
  );
  const slotsQuery = useAvailabilitySlots({ doctorProfileId, dates, timeZone });
  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);

  const blockRange = useBlockSlotRange(doctorProfileId);
  const removeSlots = useRemoveSlots(doctorProfileId);
  const unblockSlot = useUnblockSlot(doctorProfileId);

  // A selection is a statement about the window it was made in.
  useEffect(() => {
    setSelectedIds([]);
    setPendingBlock(null);
  }, [anchorDate, view]);

  const rangeLabel = (range: SlotTimeRange) =>
    `${formatDayHeading(todayInZone(new Date(range.startTime), timeZone))}, ${formatClockRange(range.startTime, range.endTime, timeZone)}`;

  function commitBlock(range: SlotTimeRange) {
    setPendingBlock(null);
    setServerConflicts([]);
    blockRange.mutate(
      { startTime: range.startTime, endTime: range.endTime },
      {
        onSuccess: (result) => {
          // The backend's own list of appointments it deliberately left alone.
          setServerConflicts(result.conflicts);
          setBlockedRange(range);
          setSelectedIds([]);
        },
        onError: (error) => setRollbackNotice(rollbackMessage(error)),
      },
    );
  }

  function handleAction(action: AvailabilityAction, slotIds: string[], range: SlotTimeRange | null) {
    setRollbackNotice(null);
    setServerConflicts([]);
    if (!range) return;

    if (action === 'block') {
      // Nothing gets cancelled quietly: name the booked appointments inside the
      // span and require a deliberate confirmation.
      const booked = slotsInTimeRange(slots.filter((slot) => slot.status === 'booked'), range);
      if (booked.length > 0) {
        setPendingBlock({ range, entries: booked.map((slot) => bookedSlotEntry(slot, timeZone)) });
        return;
      }
      commitBlock(range);
      return;
    }

    if (action === 'remove') {
      removeSlots.mutate(slotIds, {
        onSuccess: () => setSelectedIds([]),
        onError: (error) => setRollbackNotice(rollbackMessage(error)),
      });
      return;
    }

    for (const slotId of slotIds) {
      unblockSlot.mutate(slotId, { onError: (error) => setRollbackNotice(rollbackMessage(error)) });
    }
    setSelectedIds([]);
  }

  const profileError = profileQuery.error ? readErrorMessage(profileQuery.error) : null;
  const shift = (direction: number) =>
    setAnchorDate((current) => addDays(current, view === 'week' ? 7 * direction : direction));

  return (
    <div style={PAGE_STYLE}>
      <header>
        <h1>Doctor availability</h1>
        <p>
          Generate, block and remove appointment slots. Everything here is shown in {timeZone}; the server keeps slots as
          UTC instants, so a generated window means your wall clock, not the browser&rsquo;s.
        </p>
      </header>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={ROW_STYLE}>
          <div style={GROUP_STYLE}>
            <Button variant="secondary" onClick={() => shift(-1)} aria-label={view === 'week' ? 'Previous week' : 'Previous day'}>
              Previous
            </Button>
            <Button variant="secondary" onClick={() => setAnchorDate(todayInZone(new Date(), timeZone))}>
              Today
            </Button>
            <Button variant="secondary" onClick={() => shift(1)} aria-label={view === 'week' ? 'Next week' : 'Next day'}>
              Next
            </Button>
          </div>
          <div role="group" aria-label="Calendar view" style={GROUP_STYLE}>
            <Button variant={view === 'week' ? 'primary' : 'secondary'} aria-pressed={view === 'week'} onClick={() => setView('week')}>
              Week
            </Button>
            <Button variant={view === 'day' ? 'primary' : 'secondary'} aria-pressed={view === 'day'} onClick={() => setView('day')}>
              Day
            </Button>
          </div>
        </div>

        {rollbackNotice && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
            {rollbackNotice}
          </p>
        )}

        {profileError && (
          <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', margin: 0 }}>
            {profileError}
          </p>
        )}

        {serverConflicts.length > 0 && blockedRange && (
          <BlockConflictNotice stage="server" entries={serverConflicts.map(conflictEntry)} rangeLabel={rangeLabel(blockedRange)} />
        )}

        {pendingBlock && (
          <BlockConflictNotice
            stage="preview"
            entries={pendingBlock.entries}
            rangeLabel={rangeLabel(pendingBlock.range)}
            confirming={blockRange.isPending}
            onConfirm={() => commitBlock(pendingBlock.range)}
            onCancel={() => setPendingBlock(null)}
          />
        )}

        {doctorProfileId === null && !profileError ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Loading your doctor profile&hellip;</p>
        ) : (
          <AvailabilityCalendar
            slots={slots}
            dates={dates}
            view={view}
            timeZone={timeZone}
            selectedSlotIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onAction={handleAction}
            pendingSlotIds={blockRange.isPending || removeSlots.isPending ? selectedIds : []}
            isLoading={slotsQuery.isLoading || profileQuery.isLoading}
            error={slotsQuery.error ? readErrorMessage(slotsQuery.error) : null}
            onRetry={() => void slotsQuery.refetch()}
          />
        )}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <GenerateSlotsForm doctorProfileId={doctorProfileId} timeZone={timeZone} />
      </div>
    </div>
  );
}
