import { http } from 'msw';
import type { AvailabilitySlot, FollowUpRequest, PatientAppointment } from '../../types/models';
import { db } from '../db';
import { conflict, notFound, paramId, respond } from '../helpers';

function openSlots(doctorProfileId: string): AvailabilitySlot[] {
  const startTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  startTime.setMinutes(0, 0, 0);
  startTime.setHours(startTime.getHours() + 1);
  return [0, 1, 2].map((offset) => {
    const start = new Date(startTime.getTime() + offset * 24 * 60 * 60 * 1000);
    return {
      id: `slot-follow-up-${offset + 1}`,
      doctorProfileId,
      status: 'open',
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export const followUpHandlers = [
  http.get(
    '*/follow-ups/mine',
    respond('json', ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      return db.followUps.filter((followUp) => !status || followUp.status === status);
    }),
  ),
  http.get(
    '*/availability/doctors/:doctorProfileId/slots',
    respond('json', ({ params }) => openSlots(paramId(params, 'doctorProfileId'))),
  ),
  http.post(
    '*/follow-ups/:followUpId/book',
    respond('json', async ({ params, request }) => {
      const followUp = db.followUps.find((item) => item.id === paramId(params, 'followUpId'));
      if (!followUp) return notFound('follow-up request');
      if (followUp.status !== 'open') return conflict('follow-up request is no longer open');
      const body = (await request.json().catch(() => ({}))) as { availabilitySlotId?: string };
      const slot = openSlots(followUp.doctorProfileId).find((item) => item.id === body.availabilitySlotId);
      if (
        !slot ||
        Date.parse(slot.startTime) < Date.parse(followUp.windowStart) ||
        Date.parse(slot.endTime) > Date.parse(followUp.windowEnd)
      ) {
        return conflict('slot is outside the follow-up window');
      }

      const appointment: PatientAppointment = {
        id: `apt-follow-up-${Date.now()}`,
        patientProfileId: followUp.patientProfileId,
        doctorProfileId: followUp.doctorProfileId,
        availabilitySlotId: slot.id,
        status: 'scheduled',
        origin: 'follow_up',
        availabilitySlot: { ...slot, status: 'booked' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const booked: FollowUpRequest = {
        ...followUp,
        status: 'booked',
        bookedAppointmentId: appointment.id,
      };
      Object.assign(followUp, booked);
      return { appointment, followUp: booked };
    }),
  ),
];
