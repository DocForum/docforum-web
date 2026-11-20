import { api, apiFetch, apiUpload } from './api-client';
import type {
  DoctorMessageThread,
  Message,
  MessageAttachment,
  MessagePage,
  MessageThread,
  SendMessageInput,
  SignedDownloadUrl,
} from '../types/models';
import type { UploadOptions } from './api-client';

// Calls against docforum-core's consultation message thread. The
// thread/attachment endpoints below are an ASSUMED shape (docforum-core
// issues #61/#62 not landed yet) — recorded in
// ARCHITECTURE_ESSENTIALS.md "Known assumptions". Everything still flows
// through api-client, per hard rule 1.

export interface ListThreadsInput {
  filter?: 'all' | 'unread' | 'closing_soon';
  cursor?: string | null;
  limit?: number;
}

export interface ListThreadsResult {
  threads: DoctorMessageThread[];
  nextCursor: string | null;
}

export function listThreads(
  input: ListThreadsInput,
  accessToken: string,
  signal?: AbortSignal,
): Promise<ListThreadsResult> {
  return api.messaging.listThreads(input, { accessToken, signal });
}

export function markThreadRead(threadId: string, accessToken: string): Promise<void> {
  return api.messaging.markThreadRead(threadId, { accessToken });
}

export function totalUnread(threads: DoctorMessageThread[]): number {
  return threads.reduce((sum, t) => sum + t.unreadCount, 0);
}

/** Maps patient profile ids to the doctor's existing thread with that
 * patient (#230). The thread list is cursor paginated, so this walks every
 * page before concluding a patient has no thread — a patient whose thread
 * is on page 2 must still get a "Message patient" action. Patients with no
 * thread are simply absent from the result. */
export async function findThreadIdsForPatients(
  patientProfileIds: readonly string[],
  accessToken: string,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  const pending = new Set(patientProfileIds);
  if (pending.size === 0) return found;

  let cursor: string | null = null;
  do {
    const page = await listThreads({ filter: 'all', cursor, limit: 100 }, accessToken, signal);
    for (const thread of page.threads) {
      if (pending.has(thread.patientProfileId)) {
        found[thread.patientProfileId] = thread.id;
        pending.delete(thread.patientProfileId);
      }
    }
    cursor = page.nextCursor;
  } while (cursor && pending.size > 0);

  return found;
}

export function getThread(
  threadId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<MessageThread> {
  return apiFetch<MessageThread>(`/threads/${threadId}`, { accessToken, signal });
}

export function listMessages(
  threadId: string,
  cursor: string | null,
  accessToken: string,
  signal?: AbortSignal,
): Promise<MessagePage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetch<MessagePage>(`/threads/${threadId}/messages${query}`, { accessToken, signal });
}

export function sendMessage(threadId: string, input: SendMessageInput, accessToken: string): Promise<Message> {
  return apiFetch<Message>(`/threads/${threadId}/messages`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

/** Uploads one file to the thread. The server owns EXIF stripping,
 * content-type sniffing, storage quota and access checks — the client only
 * downscales large phone photos and validates type/size for fast feedback. */
export function uploadAttachment(
  threadId: string,
  file: File,
  accessToken: string,
  options: Pick<UploadOptions, 'signal' | 'onProgress'> = {},
): Promise<MessageAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<MessageAttachment>(`/threads/${threadId}/attachments`, formData, {
    accessToken,
    signal: options.signal,
    onProgress: options.onProgress,
  });
}

/** Mints a fresh short-lived signed URL for one attachment. Must be called
 * per download — the result is never persisted or cached. */
export function requestAttachmentDownloadUrl(
  threadId: string,
  attachmentId: string,
  accessToken: string,
): Promise<SignedDownloadUrl> {
  return apiFetch<SignedDownloadUrl>(`/threads/${threadId}/attachments/${attachmentId}/download-url`, {
    accessToken,
  });
}
