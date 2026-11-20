import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../../test/render';
import { GenerateSlotsForm } from './GenerateSlotsForm';
import * as availabilityService from '../../../services/availability-service';
import { ApiError } from '../../../services/api-client';
import { useAuthStore } from '../../../store/auth-store';
import type { SlotGenerationResult } from '../../../types/models';

vi.mock('../../../services/availability-service');

const TIME_ZONE = 'Africa/Lagos';
const NOW = new Date('2026-10-12T08:00:00.000Z');

function result(overrides: Partial<SlotGenerationResult> = {}): SlotGenerationResult {
  return { created: 8, skipped: 0, slots: [], ...overrides };
}

describe('GenerateSlotsForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: 'test-token', user: null });
    vi.mocked(availabilityService.generateSlots).mockReset();
  });

  function renderForm(props: Partial<Parameters<typeof GenerateSlotsForm>[0]> = {}) {
    return render(
      <GenerateSlotsForm doctorProfileId="doctor-1" timeZone={TIME_ZONE} now={NOW} {...props} />,
    );
  }

  it('defaults the range to this week in the doctor\'s own zone', () => {
    renderForm();
    expect(screen.getByLabelText('From')).toHaveValue('2026-10-12');
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-16');
    expect(screen.getByText(/Times are in Africa\/Lagos/i)).toBeInTheDocument();
  });

  it('says how many requests a range will cost before sending it', () => {
    renderForm();
    expect(screen.getByText('Sends 5 requests — one per day. Overlapping times are skipped, not duplicated.')).toBeInTheDocument();
  });

  it('sends one single-day request per day in the range', async () => {
    const generateSlots = vi.mocked(availabilityService.generateSlots);
    generateSlots.mockResolvedValue(result());
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    await waitFor(() => expect(generateSlots).toHaveBeenCalledTimes(5));
    expect(generateSlots.mock.calls.map((call) => call[1])).toEqual([
      { date: '2026-10-12', startHour: 9, endHour: 13, slotLengthMinutes: 30 },
      { date: '2026-10-13', startHour: 9, endHour: 13, slotLengthMinutes: 30 },
      { date: '2026-10-14', startHour: 9, endHour: 13, slotLengthMinutes: 30 },
      { date: '2026-10-15', startHour: 9, endHour: 13, slotLengthMinutes: 30 },
      { date: '2026-10-16', startHour: 9, endHour: 13, slotLengthMinutes: 30 },
    ]);
  });

  it('summarises created and skipped slots across the range', async () => {
    vi.mocked(availabilityService.generateSlots).mockResolvedValue(result({ created: 6, skipped: 2 }));
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Created 30 slots, skipped 10 already covered.');
  });

  it('says so when the times were already covered', async () => {
    vi.mocked(availabilityService.generateSlots).mockResolvedValue(result({ created: 0, skipped: 8 }));
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('No new slots were created');
  });

  it('names the days the server refused without hiding the rest', async () => {
    vi.mocked(availabilityService.generateSlots).mockImplementation(async (_profileId, input) => {
      if (input.date === '2026-10-14') throw new ApiError('That date is closed.', 400);
      return result({ created: 8, skipped: 0 });
    });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('Generated on 4 of 5 days');
    expect(screen.getByRole('status')).toHaveTextContent('That date is closed.');
  });

  it('refuses a daily window whose end is not after its start', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Daily window ends'), '9');
    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByText(/must be later than its start/i)).toBeInTheDocument();
    expect(availabilityService.generateSlots).not.toHaveBeenCalled();
  });

  it('refuses a slot length that does not divide the window evenly', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Slot length'), '45');
    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByText(/does not divide evenly into a 4-hour window/i)).toBeInTheDocument();
    expect(availabilityService.generateSlots).not.toHaveBeenCalled();
  });

  it('caps the range because each day is its own request', async () => {
    const user = userEvent.setup();
    renderForm();

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-12-30' } });
    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByText(/keep the range to 14 days or fewer/i)).toBeInTheDocument();
    expect(availabilityService.generateSlots).not.toHaveBeenCalled();
  });

  it('refuses a range that ends before it starts', async () => {
    const user = userEvent.setup();
    renderForm();

    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    expect(await screen.findByText(/cannot be before the first date/i)).toBeInTheDocument();
  });

  it('announces validation errors for assistive technology', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Slot length'), '45');
    await user.click(screen.getByRole('button', { name: /generate slots/i }));

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
  });

  it('cannot generate before the doctor profile has loaded', () => {
    renderForm({ doctorProfileId: null });
    expect(screen.getByRole('button', { name: /generate slots/i })).toBeDisabled();
  });
});
