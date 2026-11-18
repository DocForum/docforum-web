import type { QueryClient } from '@tanstack/react-query';
import type { Appointment, CareThread, DoctorMessageThread, Role } from '../../types/models';

export type RecordKind = 'appointment' | 'order' | 'result' | 'message';

export interface SearchRecord {
  id: string;
  kind: RecordKind;
  title: string;
  detail: string;
  href: string;
  searchableText: string;
}

export type RecordIndex = Record<RecordKind, SearchRecord[]>;

const RECORD_KINDS: RecordKind[] = ['appointment', 'order', 'result', 'message'];

export function createRecordIndex(
  queryClient: QueryClient,
  role: Role | null,
  selectedProfileId: string | null,
): RecordIndex {
  const index: RecordIndex = {
    appointment: [],
    order: [],
    result: [],
    message: [],
  };

  if (role === 'patient' && selectedProfileId) {
    const careThreads = queryClient.getQueryData<CareThread[]>(['care-threads', selectedProfileId]) ?? [];
    for (const thread of careThreads) {
      for (const step of thread.steps) {
        const kind = classifyCareStep(step);
        if (!kind) continue;
        const href = step.actionUrl && isLocalRoute(step.actionUrl)
          ? step.actionUrl
          : `/care/${encodeURIComponent(thread.id)}`;
        const detail = [thread.title, thread.doctorName, thread.specialty, step.description]
          .filter(Boolean)
          .join(' · ');
        index[kind].push({
          id: `${thread.id}:${step.id}`,
          kind,
          title: step.title,
          detail,
          href,
          searchableText: `${step.title} ${detail} ${step.timestamp ?? ''}`,
        });
      }
    }
  }

  if (role === 'doctor') {
    const appointments = queryClient.getQueryData<Appointment[]>(['doctor', 'appointments', 'today']) ?? [];
    index.appointment.push(
      ...appointments.map((appointment) => ({
        id: appointment.id,
        kind: 'appointment' as const,
        title: appointment.patientName,
        detail: [appointment.reason, appointment.status, appointment.startsAt].filter(Boolean).join(' · '),
        href: `/doctor/consultation/${encodeURIComponent(appointment.id)}`,
        searchableText: `${appointment.patientName} ${appointment.reason ?? ''} ${appointment.status} ${appointment.startsAt}`,
      })),
    );

    const seenThreads = new Set<string>();
    const threadQueries = queryClient.getQueryCache().findAll({
      queryKey: ['doctor', 'messages', 'threads'],
    });
    for (const query of threadQueries) {
      if (query.queryKey[3] !== 'all' || !isThreadListData(query.state.data)) continue;
      for (const thread of query.state.data.threads) {
        if (seenThreads.has(thread.id)) continue;
        seenThreads.add(thread.id);
        index.message.push({
          id: thread.id,
          kind: 'message',
          title: thread.patientName,
          detail: [thread.lastPreview, thread.lastMessageAt].filter(Boolean).join(' · '),
          href: '/doctor/messages',
          searchableText: `${thread.patientName} ${thread.lastPreview ?? ''} ${thread.lastMessageAt}`,
        });
      }
    }
  }

  return index;
}

export function findRecords(index: RecordIndex, query: string): RecordIndex {
  const term = query.trim().toLocaleLowerCase();
  return {
    appointment: filterKind(index.appointment, term),
    order: filterKind(index.order, term),
    result: filterKind(index.result, term),
    message: filterKind(index.message, term),
  };
}

export function flattenRecords(index: RecordIndex): SearchRecord[] {
  return RECORD_KINDS.flatMap((kind) => index[kind]);
}

function classifyCareStep(step: CareThread['steps'][number]): RecordKind | null {
  if (step.stepType === 'appointment') return 'appointment';
  if (step.stepType === 'order') return 'order';
  if (step.stepType === 'fulfillment') {
    const resultLink = `${step.title} ${step.actionLabel ?? ''} ${step.actionUrl ?? ''}`;
    return /result/i.test(resultLink) ? 'result' : 'order';
  }
  return null;
}

function isLocalRoute(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//') && !href.includes('\\');
}

function isThreadListData(value: unknown): value is { threads: DoctorMessageThread[] } {
  return Boolean(
    value
    && typeof value === 'object'
    && 'threads' in value
    && Array.isArray(value.threads)
    && value.threads.every(
      (thread) =>
        thread
        && typeof thread === 'object'
        && 'id' in thread
        && typeof thread.id === 'string'
        && 'patientName' in thread
        && typeof thread.patientName === 'string'
        && 'patientProfileId' in thread
        && typeof thread.patientProfileId === 'string'
        && 'lastMessageAt' in thread
        && typeof thread.lastMessageAt === 'string'
        && 'unreadCount' in thread
        && typeof thread.unreadCount === 'number'
        && (!('lastPreview' in thread)
          || thread.lastPreview === undefined
          || thread.lastPreview === null
          || typeof thread.lastPreview === 'string'),
    ),
  );
}

function filterKind(records: SearchRecord[], term: string): SearchRecord[] {
  return term
    ? records.filter((record) => record.searchableText.toLocaleLowerCase().includes(term))
    : [];
}
