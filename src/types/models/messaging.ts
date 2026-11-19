// --- Messaging & message attachments (Phase W2 — assumed, docforum-core
// #61 (thread) and #62 (attachments) not landed yet). See
// ARCHITECTURE_ESSENTIALS.md "Known assumptions". Attachments are stored
// behind the thread's access rules; downloads always go through a
// short-lived signed URL minted per click, never a permanent link.

export type MessageThreadStatus = 'open' | 'closed';

export interface MessageThread {
  id: string;
  appointmentId: string;
  status: MessageThreadStatus;
  createdAt: string;
  updatedAt: string;
}

export type MessageAttachmentKind = 'image' | 'pdf';

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: MessageAttachmentKind;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderProfileId: string;
  body: string;
  attachments: MessageAttachment[];
  createdAt: string;
}

/** One page of a cursor-paginated thread. `nextCursor` is null at the
 * start of the thread (older history exhausted). */
export interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
}

export interface SendMessageInput {
  body: string;
  attachmentIds?: string[];
}

/** Short-lived signed download URL — minted per request, never persisted. */
export interface SignedDownloadUrl {
  url: string;
  expiresAt: string;
}
