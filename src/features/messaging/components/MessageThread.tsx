import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { useServerEvent } from '../../../hooks/useServerEvents';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { Message, SendMessageInput } from '../../../types/models';
import { linkify } from '../linkify';
import { useMessages, useSendMessage, useThread } from '../hooks/useMessageThread';
import { AttachmentPreview } from './AttachmentPreview';
import { MessageComposer } from './MessageComposer';
import styles from './MessageThread.module.css';

interface Props {
  threadId: string;
}

interface OutboxMessage {
  id: string;
  body: string;
  attachmentIds?: string[];
  createdAt: string;
  status: 'sending' | 'failed';
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Plain text plus safe links — never `dangerouslySetInnerHTML`. */
function MessageBody({ body }: { body: string }) {
  return (
    <p className={styles.body}>
      {linkify(body).map((segment, index) =>
        segment.kind === 'link' ? (
          <a
            key={`${segment.href}-${index}`}
            className={styles.bodyLink}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {segment.text}
          </a>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </p>
  );
}

function MessageItem({ threadId, message }: { threadId: string; message: Message }) {
  return (
    <li className={styles.message}>
      {message.body && <MessageBody body={message.body} />}
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

function makeTempId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return `outbox-${cryptoApi.randomUUID()}`;
  return `outbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Shared consultation thread for patients and doctors (issue #22).
 *
 * - history is cursor-paginated; "Load older" prepends a page without
 *   disturbing the messages already on screen;
 * - sending is optimistic: the message appears immediately and can be
 *   retried from the thread if delivery fails;
 * - live updates arrive over the shared notification stream, with a 30s poll
 *   while the thread is visible as the fallback;
 * - a closed thread keeps its history readable and replaces the composer with
 *   an explanation.
 */
export function MessageThread({ threadId }: Props) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const threadQuery = useThread(threadId);
  const messagesQuery = useMessages(threadId);
  const sendMutation = useSendMessage(threadId);

  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  const isClosed = threadQuery.data?.status === 'closed';
  const cursor = nextCursor ?? messagesQuery.data?.nextCursor ?? null;

  const serverMessages = [...olderMessages, ...(messagesQuery.data?.messages ?? [])].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );

  // Switching threads must not carry another conversation's older pages,
  // outbox or scroll-focus state across.
  useEffect(() => {
    setOlderMessages([]);
    setNextCursor(null);
    setOlderError(null);
    setOutbox([]);
    counterRef.current = 0;
  }, [threadId]);

  // Live updates: the notification stream if the tab has it, otherwise the
  // query's own poll (below) catches up.
  useServerEvent(
    'message.created',
    (event) => {
      if (event.data.threadId && event.data.threadId !== threadId) return;
      void messagesQuery.refetch();
      void threadQuery.refetch();
    },
    { enabled: !isClosed },
  );

  async function handleLoadOlder() {
    if (!cursor || !accessToken || loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await messagingService.listMessages(threadId, cursor, accessToken);
      setOlderMessages((prev) => [...page.messages, ...prev]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setOlderError(
        error instanceof ApiError ? error.message : 'Could not load older messages.',
      );
    } finally {
      setLoadingOlder(false);
    }
  }

  const deliver = useCallback(
    async (id: string, input: SendMessageInput) => {
      try {
        await sendMutation.mutateAsync(input);
        setOutbox((prev) => prev.filter((message) => message.id !== id));
      } catch {
        setOutbox((prev) =>
          prev.map((message) => (message.id === id ? { ...message, status: 'failed' } : message)),
        );
      }
    },
    [sendMutation],
  );

  // Called by the composer. It resolves once the message is in the outbox —
  // delivery failures are shown on the message itself, not in the composer.
  async function queueMessage(input: SendMessageInput) {
    counterRef.current += 1;
    const id = makeTempId();
    const optimistic: OutboxMessage = {
      id,
      body: input.body,
      attachmentIds: input.attachmentIds,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setOutbox((prev) => [...prev, optimistic]);
    void deliver(id, input);
  }

  function retry(message: OutboxMessage) {
    setOutbox((prev) =>
      prev.map((item) => (item.id === message.id ? { ...item, status: 'sending' } : item)),
    );
    void deliver(message.id, { body: message.body, attachmentIds: message.attachmentIds });
  }

  function discard(messageId: string) {
    setOutbox((prev) => prev.filter((message) => message.id !== messageId));
  }

  const hasMessages = serverMessages.length > 0 || outbox.length > 0;

  return (
    <div className={styles.thread} ref={threadRef}>
      <h1 className={styles.title}>Consultation messages</h1>
      <p className={styles.privacy}>
        Messages are part of your record. Only you and your care team can read them.
      </p>

      {cursor && (
        <button type="button" className={styles.loadOlder} onClick={handleLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? 'Loading…' : 'Load older messages'}
        </button>
      )}
      {olderError && (
        <InlineError title={null} message={olderError} onRetry={() => void handleLoadOlder()} />
      )}

      {messagesQuery.isLoading ? (
        <div className={styles.loading}>
          <Skeleton lines={4} height="1.1rem" label="Loading messages" />
        </div>
      ) : messagesQuery.error && serverMessages.length === 0 ? (
        <InlineError
          title="This thread couldn't be loaded"
          message={queryErrorMessage(messagesQuery.error)}
          onRetry={() => void messagesQuery.refetch()}
        />
      ) : !hasMessages ? (
        <EmptyState
          title="No messages yet"
          description="Ask a question, share how you're feeling, or send a photo of a document. Replies arrive here."
          action={{
            label: 'Write the first message',
            onClick: () => threadRef.current?.querySelector('textarea')?.focus(),
          }}
        />
      ) : (
        <ul className={styles.list}>
          {serverMessages.map((message) => (
            <MessageItem key={message.id} threadId={threadId} message={message} />
          ))}
          {outbox.map((message) => (
            <li
              key={message.id}
              className={`${styles.message} ${styles.outbox} ${
                message.status === 'failed' ? styles.outboxFailed : ''
              }`}
            >
              {message.body && <MessageBody body={message.body} />}
              <div className={styles.outboxFooter}>
                <span className={styles.outboxStatus} role="status">
                  {message.status === 'sending' ? 'Sending…' : 'Not sent'}
                </span>
                {message.status === 'failed' && (
                  <div className={styles.outboxActions}>
                    <button type="button" className={styles.linkButton} onClick={() => retry(message)}>
                      Retry
                    </button>
                    <button type="button" className={styles.linkButton} onClick={() => discard(message.id)}>
                      Discard
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {messagesQuery.error && serverMessages.length > 0 && (
        <p className={styles.error} role="alert">
          Couldn’t refresh this thread. The messages above are still loaded.
        </p>
      )}

      {isClosed ? (
        <p className={styles.closed} role="status">
          This consultation is closed — new messages can’t be sent.
        </p>
      ) : (
        <MessageComposer threadId={threadId} onSend={queueMessage} />
      )}
    </div>
  );
}
