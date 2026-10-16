import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMessageThread } from '../hooks/useMessageThread';
import { MessageComposer } from './MessageComposer';
import styles from './MessageThread.module.css';

export interface MessageThreadProps {
  appointmentId: string;
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

export function MessageThread({
  appointmentId,
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
  } = useMessageThread(appointmentId);

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

  if (isThreadLoading && messages.length === 0) {
    return (
      <section className={[Styles.thread, className].filter(Boolean).join(' ')} aria-busy="true">
        <header className={Styles.header}>
          <h2 className={Styles.title}>{title}</h2>
        </header>
        <p className={Styles.state}>Loading consultation messages…</p>
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
    <section className={[Styles.thread, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {isClosed ? (
          <span className={styles.closedBadge}>
            Closed{closedAt ? ` · ${formatTimestamp(closedAt)}` : ''}
          </span>
        ) : (
          <span className={styles.openBadge}>Open</span>
        )}
      </header>

      {isClosed ? (
        <p className={styles.closedNotice} role="status">
          This consultation thread has been closed. Messages are kept for your records.
        </p>
      ) : null}

      <div className={styles.scrollArea} ref={scrollRef} onScroll={handleScroll}>
        {hasOlder ? (
          <div className={styles.loadOlder}>
            <button
              type="button"
              className={styles.loadOlderButton}
              onClick={loadOlder}
              disabled={isFetchingOlder}
            >
              {isFetchingOlder ? 'Loading older messages…' : 'Load older messages'}
            </button>
          </div>
        ) : null}

        {isLoadingHistory && messages.length === 0 ? (
          <p className={styles.state}>Loading messages…</p>
        ) : null}

        {!isLoadingHistory && messages.length === 0 ? (
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
        </ol>
        <div ref={bottomRef} />
      </div>

      {errorMessage ? (
        <p className={styles.error} role="alert">{errorMessage}</p>
      ) : null}

      <MessageComposer
        onSend={send}
        draft={draft}
        onDraftChange={setDraft}
        isSending={isSending}
        disabled={isClosed}
        disabledReason="This consultation thread is closed. New messages can't be sent."
      />
    </section>
  );
}
