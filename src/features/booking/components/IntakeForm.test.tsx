import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/render';
import { IntakeForm } from './IntakeForm';
import { ApiError } from '../../../services/api-client';
import * as intakeService from '../../../services/intake-service';
import { useAuthStore } from '../../../store/auth-store';
import { useIntakeDraftStore } from '../../../store/intake-draft-store';
import { useProfileStore } from '../../../store/profile-store';
import type { IntakeForm as Submitted, IntakeDraftFields } from '../../../types/models';

vi.mock('../../../services/intake-service');

const SUBMITTED: Submitted = {
  id: 'intake-1',
  appointmentId: 'appt-1',
  patientProfileId: 'pat-1',
  submittedAt: '2026-10-01T10:00:00.000Z',
  chiefComplaint: 'Recurring headaches',
  symptomDuration: '3 days',
  severity: 6,
  currentMedications: ['Ibuprofen'],
  allergies: ['Penicillin'],
  notes: 'Worse in the afternoon',
};

function draftFields(overrides: Partial<IntakeDraftFields> = {}): IntakeDraftFields {
  return {
    chiefComplaint: 'Recurring headaches',
    symptomDuration: '3 days',
    severity: '',
    currentMedications: '',
    allergies: '',
    notes: '',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(intakeService.submitIntake).mockResolvedValue(SUBMITTED);
});

describe('IntakeForm drafts', () => {
  it('autosaves in memory and resumes after the screen unmounts', async () => {
    const user = userEvent.setup();
    const first = render(<IntakeForm slotId="slot-1" appointmentId="appt-1" onSubmitted={vi.fn()} />, {
      route: '/patient/appointments/appt-1/intake',
    });

    await user.type(screen.getByLabelText(/main reason for your visit/i), 'Recurring headaches');

    expect(useIntakeDraftStore.getState().drafts['slot-1']?.fields.chiefComplaint).toBe(
      'Recurring headaches',
    );
    expect(screen.getByText(/draft saved in this tab/i)).toBeInTheDocument();

    first.unmount();

    render(<IntakeForm slotId="slot-1" appointmentId="appt-1" onSubmitted={vi.fn()} />, {
      route: '/patient/appointments/appt-1/intake',
    });
    expect(screen.getByLabelText(/main reason for your visit/i)).toHaveValue('Recurring headaches');
  });

  it('never writes drafts to browser storage', async () => {
    const setItemSpy =
      typeof Storage !== 'undefined' ? vi.spyOn(Storage.prototype, 'setItem') : null;
    const idbOpen = vi.fn();
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { open: idbOpen } });

    vi.mocked(intakeService.submitIntake).mockRejectedValueOnce(new ApiError('Server down', 500));
    const user = userEvent.setup();
    render(<IntakeForm slotId="slot-1" appointmentId="appt-1" onSubmitted={vi.fn()} />, {
      route: '/patient/intake',
    });

    await user.type(screen.getByLabelText(/main reason for your visit/i), 'Chest pain');
    await user.type(screen.getByLabelText(/current medications/i), 'Aspirin');
    await user.click(screen.getByRole('button', { name: /submit intake/i }));

    await screen.findByRole('button', { name: /try again/i });

    expect(setItemSpy?.mock.calls.length ?? 0).toBe(0);
    expect(idbOpen).not.toHaveBeenCalled();
    setItemSpy?.mockRestore();
  });

  it('keeps every answer after a failed submit and retries with the same values', async () => {
    vi.mocked(intakeService.submitIntake)
      .mockRejectedValueOnce(new ApiError('Server down', 503))
      .mockResolvedValueOnce(SUBMITTED);
    const onSubmitted = vi.fn();
    const user = userEvent.setup();

    render(<IntakeForm slotId="slot-1" appointmentId="appt-1" onSubmitted={onSubmitted} />, {
      route: '/patient/intake',
      role: 'patient',
    });

    await user.type(screen.getByLabelText(/main reason for your visit/i), 'Recurring headaches');
    await user.type(screen.getByLabelText(/how long/i), '3 days');
    await user.click(screen.getByRole('button', { name: /submit intake/i }));

    expect(await screen.findByText(/nothing you typed was lost/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/main reason for your visit/i)).toHaveValue('Recurring headaches');
    expect(useIntakeDraftStore.getState().drafts['slot-1']).toBeDefined();
    expect(onSubmitted).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(SUBMITTED));
    expect(intakeService.submitIntake).toHaveBeenLastCalledWith(
      'appt-1',
      expect.objectContaining({
        slotId: 'slot-1',
        chiefComplaint: 'Recurring headaches',
        symptomDuration: '3 days',
      }),
      'test-patient-token',
    );
    // Only success clears the draft.
    expect(useIntakeDraftStore.getState().drafts['slot-1']).toBeUndefined();
  });

  it('requires the main reason before submitting and keeps the draft', async () => {
    const user = userEvent.setup();
    render(<IntakeForm slotId="slot-1" appointmentId="appt-1" onSubmitted={vi.fn()} />, {
      route: '/patient/intake',
    });

    await user.type(screen.getByLabelText(/current medications/i), 'Aspirin');
    await user.click(screen.getByRole('button', { name: /submit intake/i }));

    expect(screen.getByText(/tell us what’s bothering you/i)).toBeInTheDocument();
    expect(intakeService.submitIntake).not.toHaveBeenCalled();
    expect(useIntakeDraftStore.getState().drafts['slot-1']?.fields.currentMedications).toBe('Aspirin');
  });
});

describe('intake draft lifecycle', () => {
  it('clears on sign-out so a shared device keeps no PHI', () => {
    useIntakeDraftStore.getState().saveDraft('slot-1', {
      appointmentId: 'appt-1',
      fields: draftFields(),
    });
    expect(useIntakeDraftStore.getState().drafts['slot-1']).toBeDefined();

    useAuthStore.getState().clearSession();

    expect(useIntakeDraftStore.getState().drafts).toEqual({});
  });

  it('clears on profile switch so a dependent never inherits someone else’s answers', () => {
    useProfileStore.setState({
      profiles: [
        { id: 'pat-1', fullName: 'Ada', isSelf: true },
        { id: 'pat-2', fullName: 'Ben', isSelf: false },
      ],
      selectedProfileId: 'pat-1',
    });
    useIntakeDraftStore.getState().saveDraft('slot-1', {
      appointmentId: 'appt-1',
      fields: draftFields(),
    });

    useProfileStore.getState().selectProfile('pat-2');

    expect(useIntakeDraftStore.getState().drafts).toEqual({});
  });
});
