import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { render, screen } from '../test/render';
import { IntakePage } from './IntakePage';
import * as appointmentsService from '../services/appointments-service';
import { useIntakeDraftStore } from '../store/intake-draft-store';
import type { PatientAppointment } from '../types/models';

vi.mock('../services/appointments-service');

function appointment(startTime: string, overrides: Partial<PatientAppointment> = {}): PatientAppointment {
  return {
    id: 'appt-1',
    patientProfileId: 'pat-1',
    doctorProfileId: 'doc-1',
    availabilitySlotId: 'slot-1',
    status: 'scheduled',
    origin: 'direct_booking',
    availabilitySlot: {
      id: 'slot-1',
      doctorProfileId: 'doc-1',
      status: 'booked',
      startTime,
      endTime: new Date(Date.parse(startTime) + 30 * 60_000).toISOString(),
      createdAt: '2026-10-01T09:00:00.000Z',
      updatedAt: '2026-10-01T09:00:00.000Z',
    },
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    intake: null,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <Routes>
      <Route path="/patient/appointments/:appointmentId/intake" element={<IntakePage />} />
    </Routes>,
    { route: '/patient/appointments/appt-1/intake', role: 'patient' },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('IntakePage slot expiry', () => {
  it('keeps the draft and offers a new slot when the slot expired while drafting', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([
      appointment('2020-01-01T10:00:00.000Z'),
    ]);
    useIntakeDraftStore.getState().saveDraft('slot-1', {
      appointmentId: 'appt-1',
      fields: {
        chiefComplaint: 'Chest pain',
        symptomDuration: '',
        severity: '',
        currentMedications: '',
        allergies: '',
        notes: '',
      },
    });

    renderPage();

    expect(await screen.findByText(/this slot is no longer available/i)).toBeInTheDocument();
    expect(screen.getByText(/your answers are still saved in this tab/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pick a new time/i })).toHaveAttribute(
      'href',
      '/appointments/appt-1',
    );
    // The draft is deliberately NOT cleared.
    expect(useIntakeDraftStore.getState().drafts['slot-1']?.fields.chiefComplaint).toBe('Chest pain');
    expect(screen.queryByRole('button', { name: /submit intake/i })).not.toBeInTheDocument();
  });

  it('offers the form for an upcoming slot with no intake yet', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([
      appointment(new Date(Date.now() + 24 * 60 * 60_000).toISOString()),
    ]);

    renderPage();

    expect(await screen.findByRole('button', { name: /submit intake/i })).toBeInTheDocument();
  });

  it('does not present a form again when intake is already submitted', async () => {
    vi.mocked(appointmentsService.listMyAppointments).mockResolvedValue([
      appointment(new Date(Date.now() + 24 * 60 * 60_000).toISOString(), {
        intake: { id: 'intake-1', createdAt: '2026-10-01T10:00:00.000Z' },
      }),
    ]);

    renderPage();

    expect(await screen.findByText(/intake already submitted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit intake/i })).not.toBeInTheDocument();
  });
});
