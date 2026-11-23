import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { render, screen } from '../../../test/render';
import { DoctorProfileView } from './DoctorProfileView';
import * as directoryService from '../../../services/doctor-directory-service';
import * as appointmentsService from '../../../services/appointments-service';
import type { AvailabilitySlot, PublicDoctor } from '../../../types/models';

vi.mock('../../../services/doctor-directory-service');
vi.mock('../../../services/appointments-service');

const SPECIALTY = { id: 'spc-derm', name: 'Dermatology', slug: 'dermatology' };

const DOCTOR: PublicDoctor = {
  id: 'doc-1',
  fullName: 'Dr. Ada Example',
  specialties: [SPECIALTY],
  timeZone: 'Europe/London',
};

const SLOT: AvailabilitySlot = {
  id: 'slot-1',
  doctorProfileId: 'doc-1',
  status: 'open',
  startTime: '2026-11-24T09:00:00.000Z',
  endTime: '2026-11-24T09:30:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  // Pin "today" to the week before the fixture slot (Tue 24 November) so
  // "Next week" lands on it whenever this suite runs. Only Date is faked:
  // timers stay real so userEvent and findBy keep working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T08:00:00.000Z'));
  window.localStorage.setItem('docforum-time-zone', 'UTC');
  vi.mocked(directoryService.getPublicDoctor).mockResolvedValue(DOCTOR);
  vi.mocked(appointmentsService.getOpenSlots).mockResolvedValue([SLOT]);
});

afterEach(() => {
  vi.useRealTimers();
});

function renderProfile() {
  return render(
    <Routes>
      <Route path="/doctors/:doctorId" element={<DoctorProfileView doctorId="doc-1" />} />
      <Route path="/patient/book" element={<p>Booking page</p>} />
    </Routes>,
    { role: 'patient', route: '/doctors/doc-1' },
  );
}

describe('DoctorProfileView', () => {
  it('shows the doctor name, verified specialties and both zones when different', async () => {
    renderProfile();

    expect(await screen.findByRole('heading', { name: 'Dr. Ada Example' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /Verified specialties/i })).toHaveTextContent('Dermatology');
    expect(screen.getByText(/Times are shown in your time zone/i)).toHaveTextContent('UTC');
    expect(screen.getByText(/local time:/i)).toHaveTextContent('Europe/London');
  });

  it('hands a selected slot off to the booking flow with the slot preselected', async () => {
    // The slot fixture is 24 Nov 2026. Pin the clock to the previous week so
    // "Next week" always contains it, rather than the test rotting as time
    // passes.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'));
    const user = userEvent.setup();
    renderProfile();

    await user.click(await screen.findByRole('button', { name: /Next week/i }));
    const slotButton = await screen.findByRole('button', {
      name: /Book Tuesday 24 November at 09:00-09:30/i,
    });
    await user.click(slotButton);

    expect(await screen.findByText('Booking page')).toBeInTheDocument();
  });
});
