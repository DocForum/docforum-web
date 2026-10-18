import { useParams, Link } from 'react-router-dom';
import { useCareThread, useCareThreads } from '../features/care-thread/hooks/useCareThread';
import { CareTimeline } from '../features/care-thread/components/CareTimeline';
import { ActingForBanner } from '../features/dependents/components/ActingForBanner';

export function CareThreadPage() {
  const { threadId } = useParams<{ threadId?: string }>();
  const { data: threads, isLoading: isLoadingThreads } = useCareThreads();

  // If a specific threadId is requested, use it; otherwise default to the first thread
  const activeThreadId = threadId ?? threads?.[0]?.id;
  const { data: thread, isLoading: isLoadingThread } = useCareThread(activeThreadId);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ActingForBanner />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', margin: '0 0 var(--space-2)' }}>
            Care journey timeline
          </h1>
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            One continuous thread from initial consultation booking to specialist referral, diagnostic lab orders, and
            escrow settlement.
          </p>
        </div>

        {threads && threads.length > 1 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Episode:</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {threads.map((t) => (
                <Link
                  key={t.id}
                  to={`/care/${t.id}`}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: t.id === activeThreadId ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: t.id === activeThreadId ? '#ffffff' : 'var(--color-text)',
                  }}
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <CareTimeline thread={thread} isLoading={isLoadingThreads || isLoadingThread} />
    </div>
  );
}
