import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { queryErrorMessage } from '../../../components/states/QueryState';
import { Skeleton } from '../../../components/states/Skeleton';
import { Spinner } from '../../../components/Spinner';
import { ApiError } from '../../../services/api-client';
import * as messagingService from '../../../services/messaging-service';
import { useAuthStore } from '../../../store/auth-store';
import type { Message } from '../../../types/models';
import { useMessageThread, useMessages, useThread } from '../hooks/useMessageThread';
import { AttachmentPreview } from './AttachmentPreview';
import { MessageComposer } from './MessageComposer';
import styles from './MessageThread.module.css';

export interface MessageThreadProps {
  appointmentId?: string;
  threadId?: string;
  currentUserId?: string;
  title?: string;
  className?: string;
}

const URL_REGEX = /\(https?:\/\/[^\s<>()]+)/gi;

function renderLinkifiedText(text: string) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const index = match.index;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    const href = match[0];
    nodes.push(
      <a
        key={`${href}-${index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {href}
      </a>,
    );
    lastIndex = index + href.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length > 0 ? nodes : [text];
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
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

export function MessageThread({
  appointmentId,
  threadId,
  currentUserId,
  title = 'Consultation messages',
  className,
}: MessageThreadProps) {
  const {
    thread,
    isThreadLoading,
    threadError,
    messages,
    isLoadingHistory,
    hasOlder,
    isFetchingOlder,
    loadOlder,
    send,
    retry,
    isSending,
    isClosed,
    closedAt,
    draft,
    setDraft,
    errorMessage,
  } = useMessageThread(appointmentId ?? '');

  const accessToken = useAuthStore((state) => state.accessToken);
  const threadQuery = useThread(threadId ?? '');
  const messagesQuery = useMessages(threadId ?? '');
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length === lastLengthRef.current) return;
    const grew = messages.length > lastLengthRef.current;
    lastLengthRef.current = messages.length;
    if (grew && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop < 64) loadOlder();
  }, [loadOlder]);

  const rendered = useMemo(() => messages, [messages]);

  const cursor = nextCursor ?? messagesQuery.data?.nextCursor ?? null;
  const combinedMessages = [...olderMessages, ...(messagesQuery.data?.messages ?? [])];
  const isThreadClosed = isClosed || threadQuery.data?.status === 'closed';

  async function handleLoadOlder() {
    if (!cursor || !accessToken || loadingOlder) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await messagingService.listMessages(threadId ?? '', cursor, accessToken);
      setOlderMessages((prev) => [...page.messages, ...prev]);
      setNextCursor(page.nextCursor);
    } catch (error) {
      setOlderError(error instanceof ApiError ? error.message : 'Could not load older messages.');
    } finally {
      setLoadingOlder(false);
    }
  }

  if (isThreadLoading && messages.length === 0) {
    return (
      <section className={[styles.thread, className].filter(Boolean).join(' ')} aria-busy="true">
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </header>
        <p className={styles.state}>Loading consultation messages…</p>
      </section>
    );
  }

  if (threadError && !thread) {
    return (
      <section className={[styles.thread, className].filter(Boolean).join(' ')}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
        </header>
        <p className={styles.error} role="alert">
          Could not load this consultation thread. Refresh to try again.
        </p>
      </section>
    );
  }

  return (
    <section className={[styles.thread, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {isThreadClosed ? (
          <span className={styles.closedBadge}>
            Closed{closedAt ? ` · ${formatTimestamp(closedAt)}` : ''}
          </span>
        ) : (
          <span className={styles.openBadge}>Open</span>
        )}
      </header>

      {isThreadClosed ? (
        <p className={styles.closedNotice} role="status">
          This consultation thread has been closed. Messages are kept for your records.
        </p>
      ) : null}

      <div className={styles.scrollArea} ref={scrollRef} onScroll={handleScroll}>
        {hasOlder || cursor ? (
          <div className={styles.loadOlder}>
            <button
              type="button"
              className={styles.loadOlderButton}
              onClick={hasOlder ? loadOlder : handleLoadOlder}
              disabled={isFetchingOlder || loadingOlder}
            >
              {isFetchingOlder || loadingOlder ? 'Loading older messages…' : 'Load older messages'}
            </button>
          </div>
        ) : null}

        {olderError ? (
          <p className={styles.error} role="alert">
            {olderError}
          </p>
        ) : null}

        {isLoadingHistory && messages.length === 0 ? (
          <p className={styles.state}>Loading messages…</p>
        ) : null}

        {!isLoadingHistory && messages.length === 0 && combinedMessages.length === 0 ? (
          <p className={styles.state}>
            No messages yet. Say hello to start the consultation.
          </p>
        ) : null}

        <ol className={styles.list}>
          {rendered.map((message, index) => {
            const prev = rendered[index - 1];
            const showDay = !prev || !isSameDay(prev.createdAt, message.createdAt);
            const mine = Boolean(currentUserId) && message.senderId === currentUserId;
            return (
              <li key={message.clientId} className={styles.item}>
                {showDay ? (
                  <div className={styles.dayDivider}>
                    <span>{formatTimestamp(message.createdAt)}</span>
                  </div>
                ) : null}
                <article
                  className={[mine ? styles.mine : styles.thems, message.status === 'failed' ? styles.failed : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <header className={styles.messageHeader}>
                    <span className={styles.sender}>
                      {mine ? 'You' : message.senderRole === 'doctor' ? 'Doctor' : 'Patient'}
                    </span>
                    <time dateTime={message.createdAt}>
                      {formatTimestamp(message.createdAt)}
                    </time>
                  </header>
                  <p className={styles.body}>{renderLinkifiedText(message.body)}</p>
                  {message.status === 'sending' ? (
                    <span className={styles.statusLine}>Sending…</span>
                  ) : null}
                  {message.status === 'failed' ? (
                    <div className={styles.failedRow} role="alert">
                      <span>Not sent.</span>
                      <button
                        type="button"
                        className={styles.retryButton}
                        onClick={() => retry(message.clientId)}
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
          {combinedMessages.map((message) => (
            <MessageItem key={message.id} threadId={threadId ?? ''} message={message} />
          ))}
        </ol>
        <div ref={bottomRef} />
      </div>

      {errorMessage ? (
        <p className={styles.error} role="alert">{errorMessage}</p>
      ) : null}

      {isThreadClosed ? (
        <p className={styles.closed} role="status">
          This consultation is closed — new messages can’t be sent.
        </p>
      ) : (
        <MessageComposer
          onSend={send}
          draft={draft}
          onDraftChange={setDraft}
          isSending={isSending}
          disabled={isThreadClosed}
          disabledReason="This consultation thread is closed. New messages can't be sent."
        />
      )}
    </section>
  );
}