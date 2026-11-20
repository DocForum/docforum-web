import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { QueuePanel } from './QueuePanel';
import * as appointmentsService from '../../../services/appointments-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { PatientAppointment, AppointmentQueue } from '../../../types/models';

vi.mock('../../../services/appointments-service');

const NOW = new Date('2026-10-16T12:00:00Z');

class Prompt {
  static permission: NotificationPermission = 'default';
  static answer: NotificationPermission = 'granted';
  static count = 0;

  static requestPermission(): Promise<NotificationPermission> {
    Prompt.count += 1;
    Prompt.permission = Prompt.answer;
    return Promise.resolve(Prompt.answer);
  }
}

function stubNotification(permission: NotificationPermission, answer?: NotificationPermission) {
  Prompt.permission = permission;
  Prompt.answer = answer ?? permission;
  Prompt.count = 0;
  vi.stubGlobal('Notification', Prompt);
}

function queue(overrides: Partial<AppointmentQueue> = {}): AppointmentQueue {
  return {
    appointmentId: 'apt-1',
    phase: 'waiting',
    peopleAhead: 3,
    estimatedWaitMinutes: 12,
    checkInOpensAt: null,
    checkedInAt: '2026-10-16T11:30:00Z',
    ...overrides,
  };
}

const APPOINTMENT: PatientAppointment = {
  id: 'apt-1',
  patientProfileId: 'pp-1',
  doctorProfileId: 'dp-1',
  availabilitySlotId: 'slot-1',
  status: 'scheduled',
  origin: 'direct_booking',
  createdAt: '2026-10-13T09:00:00Z',
  updatedAt: '2026-10-13T09:00:00Z',
  availabilitySlot: {
    id: 'slot-1',
    doctorProfileId: 'dp-1',
    status: 'booked',
    startTime: NOW.toISOString(),
    endTime: '2026-10-16T13:00:00Z',
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
};

function mockQueue(value: AppointmentQueue | Error) {
  vi.mocked(appointmentsService.getAppointmentQueue).mockImplementation(() =>
    value instanceof Error ? Promise.reject(value) : Promise.resolve(value),
  );
}

async function renderPanel() {
  render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);
  return screen.findByText(/ahead of you|queue|turn|complete/i);
}

describe('QueuePanel', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(appointmentsService.getAppointmentQueue).mockReset();
    vi.mocked(appointmentsService.checkIn).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the position with the wait labelled as an estimate', async () => {
    mockQueue(queue());
    await renderPanel();

    expect(await screen.findByText(/3 people ahead of you/i)).toBeInTheDocument();
    expect(screen.getByText(/about 12 min \(estimate\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^check in$/i })).not.toBeInTheDocument();
  });

  it('says the position is unpublished instead of reading it as first place', async () => {
    mockQueue(queue({ peopleAhead: null, estimatedWaitMinutes: null }));
    await renderPanel();

    expect(await screen.findByText(/has not been published yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 people ahead/i)).not.toBeInTheDocument();
  });

  it('explains a check-in window that has not opened', async () => {
    mockQueue(
      queue({
        phase: 'not_open',
        checkedInAt: null,
        peopleAhead: null,
        estimatedWaitMinutes: null,
        checkInOpensAt: '2026-10-16T17:00:00Z',
      }),
    );
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    // Printed in the patient's own clock, so only the shape is asserted here.
    expect(await screen.findByText(/check-in opens at \d{2}:\d{2}/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^check in$/i })).not.toBeInTheDocument();
  });

  it('checks the patient in once the window has opened', async () => {
    mockQueue(queue({ phase: 'not_open', checkedInAt: null, checkInOpensAt: '2026-10-16T11:00:00Z' }));
    vi.mocked(appointmentsService.checkIn).mockResolvedValue(queue({ checkedInAt: '2026-10-16T12:00:00Z' }));

    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);
    // The window passed but the backend has not recomputed the phase yet, so
    // the copy must not keep announcing a time that has already gone.
    expect(await screen.findByText(/check-in is open now/i)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /^check in$/i }));

    await waitFor(() => expect(appointmentsService.checkIn).toHaveBeenCalledWith('apt-1', 'test-token'));
    expect(await screen.findByText(/you are in the queue/i)).toBeInTheDocument();
    expect(screen.getByText(/checked in at \d{2}:\d{2}/i)).toBeInTheDocument();
  });

  it('announces the turn', async () => {
    mockQueue(queue({ phase: 'being_seen' }));
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    expect(await screen.findByText(/it's your turn/i)).toBeInTheDocument();
    expect(screen.getByText(/go to the desk now/i)).toBeInTheDocument();
  });

  it('does not offer check-in for a visit that has finished', async () => {
    mockQueue(queue({ phase: 'completed' }));
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    expect(await screen.findByText(/visit is complete/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^check in$/i })).not.toBeInTheDocument();
  });

  // core#129 has not landed, so today a queue read is a 404 — and "there is no
  // queue yet" must not be printed as "you are not in it".
  it('says check-in is unavailable when the endpoint does not exist', async () => {
    mockQueue(new ApiError('Not Found', 404));
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    expect(await screen.findByText(/check-in is not available for this visit yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^check in$/i })).not.toBeInTheDocument();
  });

  it('surfaces the API message for any other queue failure', async () => {
    mockQueue(new ApiError('The queue service is restarting.', 503));
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    expect(await screen.findByText(/queue service is restarting/i)).toBeInTheDocument();
  });

  it('offers the alert opt-in while the patient is waiting, and only asks when it is ticked', async () => {
    stubNotification('default', 'granted');
    mockQueue(queue());
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    const checkbox = await screen.findByRole('checkbox');
    expect(Prompt.count).toBe(0);

    await userEvent.click(checkbox);
    await waitFor(() => expect(Prompt.count).toBe(1));
  });

  it('stops offering alerts once the browser has refused them', async () => {
    stubNotification('denied');
    mockQueue(queue());
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    expect(await screen.findByText(/turned off for this site/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(Prompt.count).toBe(0);
  });

  it('says on-page updates still work when the browser has no alert API', async () => {
    vi.stubGlobal('Notification', undefined);
    mockQueue(queue());
    render(<QueuePanel appointment={APPOINTMENT} now={NOW} />);

    expect(await screen.findByText(/3 people ahead of you/i)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/turned off for this site/i)).not.toBeInTheDocument();
  });
});
