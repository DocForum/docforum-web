import { useState } from 'react';
import { useCalendarFeed, useRotateCalendarToken } from '../hooks/useCalendar';
import { Button } from '../../../components/Button';
import styles from './CalendarSubscriptionSection.module.css';

export function CalendarSubscriptionSection() {
  const { data: feed, isLoading, error } = useCalendarFeed();
  const rotateMutation = useRotateCalendarToken();
  const [urlCopied, setUrlCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [revealUrl, setRevealUrl] = useState(false);
  const [rotateConfirm, setRotateConfirm] = useState(false);

  const maskedUrl = feed?.icsUrl
    ? feed.icsUrl.replace(/[^\?]/g, '*')
    : '';

  const handleCopy = async () => {
    if (!feed?.icsUrl) return;
    try {
      await navigator.clipboard.writeText(feed.icsUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRotate = async () => {
    setRotateConfirm(true);
  };

  const handleRotateConfirm = async () => {
    setRotating(true);
    try {
      await rotateMutation.mutateAsync();
      setRotateConfirm(false);
      setRotating(false);
    } catch (err) {
      setRotating(false);
      // error will be shown by mutation
    }
  };

  const handleRotateCancel = () => {
    setRotateConfirm(false);
  };

  if (isLoading) return <p>Loading calendar feed...</p>;
  if (error) return <p>Error loading calendar feed.</p>;
  if (!feed) return <p>No calendar feed available.</p>;

  return (
    <section className={styles.section}>
      <h2>Calendar sync</h2>
      <p>
        Add your DocForum appointments to Google Calendar, Outlook, or Apple Calendar.
        The feed contains appointment times and types (consultation, follow‑up, etc.)
        but does not include patient names or sensitive details.
      </p>

      <div className={styles.urlContainer}>
        <label htmlFor="calendar-url">Calendar feed URL</label>
        <div className={styles.urlInputWrapper}>
          <input
            type="text"
            value={revealUrl ? feed.icsUrl : maskedUrl}
            readOnly
            className={styles.urlInput}
          />
          <Button
            variant="secondary"
            onClick={() => setRevealUrl(!revealUrl)}
          >
            {revealUrl ? 'Hide' : 'Show'}
          </Button>
          <Button
            variant="secondary"
            onClick={handleCopy}
            disabled={urlCopied}
          >
            {urlCopied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className={styles.instructions}>
        <h3>How to add to your calendar</h3>
        <ul>
          <li>
            <strong>Google Calendar:</strong> In the left sidebar, click "+" next to
            "Other calendars" → "From URL", paste the URL, and click "Add calendar".
          </li>
          <li>
            <strong>Outlook:</strong> Right-click "Other calendars" → "Add calendar"
            → "From Internet", paste the URL, and subscribe.
          </li>
          <li>
            <strong>Apple Calendar:</strong> File → New Calendar Subscription,
            paste the URL, and click "Subscribe".
          </li>
        </ul>
      </div>

      {rotateConfirm ? (
        <div className={styles.confirmModal}>
          <div className={styles.confirmContent}>
            <h3>Rotate calendar feed URL?</h3>
            <p>
              Rotating will invalidate the current URL. You will need to update the
              URL in your calendar application(s).
            </p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={handleRotateCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleRotateConfirm}
                loading={rotating}
              >
                Rotate URL
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={handleRotate}
          disabled={rotateMutation.isPending}
          loading={rotateMutation.isPending}
        >
          Rotate feed token
        </Button>
      )}
    </section>
  );
}
