import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react';
import styles from './MessageThread.module.css';

export interface MessageComposerProps {
  onSend: (body: string) => void;
  draft: string;
  onDraftChange: (draft: string) => void;
  isSending: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const MAX_LENGTH = 4000;

export function MessageComposer({
  onSend,
  draft,
  onDraftChange,
  isSending,
  disabled,
  disabledReason,
}: MessageComposerProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();
      const trimmed = draft.trim();
      if (!trimmed) {
        setLocalError('Write a message before sending.');
        return;
      }
      if (trimmed.length > MAX_LENGTH) {
        setLocalError(`Messages are limited to ${MAX_LENGTH} characters.`);
        return;
      }
      setLocalError(null);
      onSend(trimmed);
      onDraftChange('');
    },
    [draft, onSend, onDraftChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event as unknown as FormEvent);
      }
    },
    [handleSubmit],
  );

  if (disabled) {
    return (
      <div className={styles.composerDisabled} role="status">
        {disabledReason ?? 'This consultation thread is closed.'}
      </div>
    );
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label className={styles.composerLabel} htmlFor="message-composer-input">
        Message
      </label>
      <textarea
        id="message-composer-input"
        className={styles.composerInput}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message…"
        rows={3}
        maxLength={MAX_LENGTH + 1}
        disabled={isSending}
        aria-label="Message text"
      />
      <div className={styles.composerFooter}>
        <span className={styles.composerHint}>
          {isSending ? 'Sending…' : 'Enter to send, shift+Enter for a new line'}
        </span>
        <button
          type="submit"
          className={styles.composerSend}
          disabled={isSending || !draft.trim()}
        >
          {isSending ? 'Sending…& : 'Send'}
        </button>
      </div>
      {localError ? (
        <p className={styles.composerError} role="alert">
          {localError}
        </p>
      ) : null}
    </form>
  );
}
