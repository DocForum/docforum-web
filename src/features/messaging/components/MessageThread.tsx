import { useState } from 'react';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { Message } from '../../../types/models';
import { useMessages, useThread } from '../hooks/useMessageThread';
import { AttachmentPreview } from './AttachmentPreview';
import { MessageComposer } from './MessageComposer';
import styles from './MessageThread.module.css';

interface Props {
  threadId: string;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessageItem({ threadId, message }: { threadId: string; message: Message }) {
  return (
    <li className={styles.message}>
      {/* Text only — never rendered as HTML (message bodies are PHI). */}
      {message.body && <p className={styles.body}>{message.body}</p>}
      {message.attachments.length > 0 && (
        <div className={styles.attachments}>
          {message.attachments.map((attachment) => (
            <AttachmentPreview key={attachment.id} threadId={threadId} attachment={attachment} />
          ))}
        </div>
      )}
      <time className={styles.time} dateTime={message.createdAt}>
        {formatTime(message.createdAt)}
      </time>
    </li>
  );
}

/** Minimal shared thread shell (patients + doctors) — the full thread UX
 * (optimistic send, live updates, per-side layout) is issue #22's scope;
 * this exists so the attachment composer/preview have a real home. */
export function MessageThread({ threadId }: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const threadQuery = useThread(threadId);
  const messagesQuery = useMessages(threadId);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  const cursor = nextCursor ?? messagesQuery.data?.nextCursor ?? null;
  const messages = [...olderMessages, ...(messagesQuery.data?.messages ?? [])];
  const isClosed = threadQuery.data?.status === 'closed';

  async function handleLoadOlder() {
    if (!cursor || !accessToken || loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await messagingService.listMessages(threadId, cursor, accessToken);
      setOlderMessages((prev) => [...page.messages, ...prev]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setOlderError(error instanceof ApiError ? error.message : 'Could not load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  }

  return (
    <div className={styles.thread}>
      <h1 className={styles.title}>Consultation messages</h1>

      {cursor && (
        <button type="button" className={styles.loadOlder} onClick={handleLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? 'Loading…' : 'Load older messages'}
        </button>
      )}
      {olderError && (
        <p className={styles.error} role="alert">
          {olderError}
        </p>
      )}

      {messagesQuery.isLoading ? (
        <div className={styles.loading}>
          <Spinner size={20} />
        </div>
      ) : messagesQuery.error ? (
        <p className={styles.error} role="alert">
          Could not load this thread.
        </p>
      ) : messages.length === 0 ? (
        <p className={styles.empty}>No messages yet. Start the conversation below.</p>
      ) : (
        <ul className={styles.list}>
          {messages.map((message) => (
            <MessageItem key={message.id} threadId={threadId} message={message} />
          ))}
        </ul>
      )}

      {isClosed ? (
        <p className={styles.closed} role="status">
          This consultation is closed — new messages can’t be sent.
        </p>
      ) : (
        <MessageComposer threadId={threadId} />
      )}
    </div>
  );
}
