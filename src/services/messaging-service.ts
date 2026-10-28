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
