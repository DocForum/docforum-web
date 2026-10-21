import { http, HttpResponse } from 'msw';
import { db } from '../db';
import { respond } from '../helpers';
import { DOCTOR_PROFILE_ID, PATIENT_PROFILE_ID } from '../fixtures';
import type { CreateBookingInput, PatientAppointment } from '../../types/models';

export const patientCoreHandlers = [
  // Appointments list for patient (GET /appointments/mine)
  http.get('*/appointments/mine', respond('json', () => db.patientAppointments)),

  // Doctor slots list (GET /doctors/:doctorId/slots)
  http.get('*/doctors/:doctorId/slots', respond('json', () => db.availabilitySlots)),

  // Create booking (POST /appointments)
  http.post(
    '*/appointments',
    respond('json', async ({ request }) => {
      const body = (await request.json()) as CreateBookingInput;
      if (body.slotId === 'slt-demo-409') {
        return HttpResponse.json(
          { message: 'Slot is no longer available' },
          { status: 409 }
        );
      }

      const slot = db.availabilitySlots.find((s) => s.id === body.slotId) || {
        id: body.slotId,
        doctorProfileId: DOCTOR_PROFILE_ID,
        status: 'booked' as const,
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 1800000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newAppointment: PatientAppointment = {
        id: `papt-mock-${Date.now()}`,
        patientProfileId: body.patientProfileId || PATIENT_PROFILE_ID,
        doctorProfileId: slot.doctorProfileId,
        doctorName: 'Dr. Ficticia Example',
        doctorSpecialty: 'General Practice',
        availabilitySlotId: slot.id,
        status: 'scheduled',
        origin: 'direct_booking',
        availabilitySlot: {
          ...slot,
          status: 'booked',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.patientAppointments.unshift(newAppointment);
      return HttpResponse.json(newAppointment, { status: 201 });
    })
  ),

  // Pending referrals (GET /referrals/pending)
  http.get('*/referrals/pending', respond('json', () => db.pendingReferrals)),

  // Accept referral (POST /referrals/:id/accept)
  http.post(
    '*/referrals/:id/accept',
    respond('json', async ({ params }) => {
      const id = String(params.id);
      const referral = db.pendingReferrals.find((r) => r.id === id);
      if (!referral) {
        return HttpResponse.json({ message: 'Referral not found' }, { status: 404 });
      }

      referral.status = 'accepted';
      db.pendingReferrals = db.pendingReferrals.filter((r) => r.id !== id);

      const createdAppointment: PatientAppointment = {
        id: `papt-ref-${Date.now()}`,
        patientProfileId: PATIENT_PROFILE_ID,
        doctorProfileId: DOCTOR_PROFILE_ID,
        doctorName: referral.referringDoctorName,
        doctorSpecialty: referral.targetSpecialty,
        availabilitySlotId: `slt-auto-${Date.now()}`,
        status: 'scheduled',
        origin: 'referral',
        availabilitySlot: {
          id: `slt-auto-${Date.now()}`,
          doctorProfileId: DOCTOR_PROFILE_ID,
          status: 'booked',
          startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
          endTime: new Date(Date.now() + 86400000 * 2 + 1800000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.patientAppointments.unshift(createdAppointment);

      return HttpResponse.json({
        referralId: id,
        createdAppointment,
      });
    })
  ),

  // Decline referral (POST /referrals/:id/decline)
  http.post(
    '*/referrals/:id/decline',
    respond('json', async ({ params }) => {
      const id = String(params.id);
      db.pendingReferrals = db.pendingReferrals.filter((r) => r.id !== id);
      return HttpResponse.json({ success: true, referralId: id });
    })
  ),

  // Follow-up requests (GET /follow-up-requests/mine)
  http.get('*/follow-up-requests/mine', respond('json', () => db.followUpRequests)),

  // Book follow-up (POST /follow-up-requests/:id/book)
  http.post(
    '*/follow-up-requests/:id/book',
    respond('json', async ({ params, request }) => {
      const id = String(params.id);
      const body = (await request.json()) as { slotId: string };

      if (body.slotId === 'slt-demo-409') {
        return HttpResponse.json(
          { message: 'Slot is no longer available' },
          { status: 409 }
        );
      }

      const requestItem = db.followUpRequests.find((r) => r.id === id);
      if (!requestItem) {
        return HttpResponse.json({ message: 'Follow-up request not found' }, { status: 404 });
      }

      requestItem.status = 'booked';

      const createdAppointment: PatientAppointment = {
        id: `papt-fur-${Date.now()}`,
        patientProfileId: PATIENT_PROFILE_ID,
        doctorProfileId: requestItem.doctorId,
        doctorName: requestItem.doctorName,
        doctorSpecialty: requestItem.doctorSpecialty,
        availabilitySlotId: body.slotId,
        status: 'scheduled',
        origin: 'direct_booking',
        availabilitySlot: {
          id: body.slotId,
          doctorProfileId: requestItem.doctorId,
          status: 'booked',
          startTime: new Date(Date.now() + 86400000 * 3).toISOString(),
          endTime: new Date(Date.now() + 86400000 * 3 + 1800000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.patientAppointments.unshift(createdAppointment);

      return HttpResponse.json(createdAppointment);
    })
  ),
];
