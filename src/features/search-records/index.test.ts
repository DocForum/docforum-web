import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createRecordIndex, findRecords } from './index';
import type { CareThread } from '../../types/models';

function thread(id: string, profileId: string, title: string): CareThread {
  return {
    id,
    patientProfileId: profileId,
    title,
    doctorName: 'Dr. Ada',
    specialty: 'Cardiology',
    startedAt: '2026-03-02T10:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    status: 'active',
    steps: [
      {
        id: `${id}-appointment`,
        stepType: 'appointment',
        title: 'March appointment',
        description: 'Annual checkup',
        status: 'completed',
      },
      {
        id: `${id}-order`,
        stepType: 'order',
        title,
        description: 'Blood test',
        status: 'pending',
      },
      {
        id: `${id}-result`,
        stepType: 'fulfillment',
        title: 'Blood test results',
        description: 'Results are ready',
        status: 'completed',
        actionLabel: 'View results',
        actionUrl: `/patient/results/${id}`,
      },
    ],
  };
}

describe('record search index', () => {
  it('indexes only the active acting-for profile and follows result links', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['care-threads', 'profile-1'], [thread('thread-1', 'profile-1', 'CBC panel')]);
    queryClient.setQueryData(['care-threads', 'profile-2'], [thread('thread-2', 'profile-2', 'Metabolic panel')]);

    const index = createRecordIndex(queryClient, 'patient', 'profile-1');

    expect(index.appointment).toHaveLength(1);
    expect(index.order[0]?.title).toBe('CBC panel');
    expect(index.result[0]?.href).toBe('/patient/results/thread-1');
    expect(findRecords(index, 'metabolic').order).toHaveLength(0);
  });

  it('indexes a doctor’s loaded appointments and message pages only', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['doctor', 'appointments', 'today'], [{
      id: 'appointment-1',
      doctorProfileId: 'doctor-1',
      patientProfileId: 'patient-1',
      patientName: 'Alex Patient',
      startsAt: '2026-03-02T10:00:00Z',
      endsAt: '2026-03-02T10:30:00Z',
      status: 'scheduled',
      reason: 'Blood test follow-up',
    }]);
    queryClient.setQueryData(['doctor', 'messages', 'threads', 'all', null, 10], {
      threads: [{
        id: 'message-1',
        patientProfileId: 'patient-1',
        patientName: 'Alex Patient',
        lastMessageAt: '2026-03-02T10:00:00Z',
        unreadCount: 1,
        lastPreview: 'The test results arrived',
      }, {
        id: 'message-2',
        patientProfileId: 'patient-2',
        patientName: 'Morgan Patient',
        lastMessageAt: '2026-03-01T10:00:00Z',
        unreadCount: 0,
      }],
      nextCursor: null,
    });
    queryClient.setQueryData(['doctor', 'messages', 'threads', 'unread', null, 10], {
      threads: [{
        id: 'message-1',
        patientProfileId: 'patient-1',
        patientName: 'Alex Patient',
        lastMessageAt: '2026-03-02T10:00:00Z',
        unreadCount: 1,
        lastPreview: 'The test results arrived',
      }],
      nextCursor: null,
    });

    const index = createRecordIndex(queryClient, 'doctor', null);

    expect(index.appointment[0]?.href).toBe('/doctor/consultation/appointment-1');
    expect(index.message).toHaveLength(2);
    expect(index.message[0]?.href).toBe('/doctor/messages');
    expect(index.order).toHaveLength(0);
  });
});
