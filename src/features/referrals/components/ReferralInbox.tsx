import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/states/EmptyState';
import { InlineError } from '../../../components/states/InlineError';
import { Skeleton } from '../../../components/states/Skeleton';
import { useErrorMessage } from '../../../hooks/useErrorText';
import { useReferralInbox } from '../hooks/useReferralInbox';
import type { ReferralInboxView } from '../hooks/useReferralInbox';
import { ReferralStatusPill } from './ReferralStatusPill';
import type { ReferralSummary } from '../../../types/models';
import styles from './ReferralInbox.module.css';

const TABS: ReadonlyArray<{ key: ReferralInboxView; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'upcoming', label: 'With upcoming appointment' },
];

function emptyTitle(view: ReferralInboxView): string {
  return view === 'all' ? 'No referrals yet' : `No ${view} referrals`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function hasScheduledAppointment(referral: ReferralSummary) {
  return Boolean(referral.resultingAppointmentId) && referral.appointment?.status === 'scheduled';
}

function ReferralListItem({ referral }: { referral: ReferralSummary }) {
  // Accepting a referral is the patient-side action (issue #4) — there is no
  // accept/decline endpoint for the specialist, so the copy here stays
  // honest: every item links to the detail reader, pending items framed as
  // "respond" rather than a fake accept button.
  const actionLabel = referral.status === 'pending' ? 'Respond to referral' : 'Open referral';

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.doctor}>{referral.referringDoctor.fullName}</span>
        <ReferralStatusPill status={referral.status} />
      </div>
      {referral.targetSpecialty ? <span className={styles.specialty}>{referral.targetSpecialty.name}</span> : null}
      <p className={styles.snapshotMeta}>
        Snapshot taken <time dateTime={referral.snapshotTakenAt}>{formatDate(referral.snapshotTakenAt)}</time>
      </p>
      <p className={styles.notes}>{referral.snapshotNotes}</p>
      {hasScheduledAppointment(referral) ? (
        <Link className={styles.appointmentLink} to={`/doctor/appointments/${referral.resultingAppointmentId}`}>
          Upcoming appointment
        </Link>
      ) : null}
      <Link className={styles.actionLink} to={`/doctor/referrals/${referral.id}`}>
        {actionLabel}
      </Link>
    </li>
  );
}

export function ReferralInbox() {
  const [view, setView] = useState<ReferralInboxView>('all');
  const query = useReferralInbox(view);
  const errorText = useErrorMessage();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const items = query.data?.pages.flatMap((page) => page.items);
  // v5 keeps `status: 'error'` on failed refetches of already-loaded pages,
  // but truthiness of `error` is the stable signal either way.
  const firstPageFailed = Boolean(query.error) && !query.data;
  const laterPageFailed = Boolean(query.error) && Boolean(query.data);

  // Automatic activation: focus and selection move together. The tabs filter
  // a server-paginated list, so manual activation would leave a focused tab
  // whose panel isn't the visible one.
  function handleTabListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const current = TABS.findIndex((tab) => tab.key === view);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (current + delta + TABS.length) % TABS.length;
    setView(TABS[next].key);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className={styles.root} aria-labelledby="inbox-heading">
      <h1 id="inbox-heading" className={styles.heading}>
        Referrals
      </h1>

      <div
        className={styles.tabList}
        role="tablist"
        aria-label="Referral status"
        onKeyDown={handleTabListKeyDown}
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`referral-tab-${tab.key}`}
            aria-controls="referral-panel"
            aria-selected={view === tab.key}
            tabIndex={view === tab.key ? 0 : -1}
            className={styles.tab}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            onClick={() => setView(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="referral-panel"
        role="tabpanel"
        aria-labelledby={`referral-tab-${view}`}
        tabIndex={0}
        className={styles.panel}
      >
        {query.isPending ? <Skeleton lines={4} label="Loading referrals" /> : null}

        {firstPageFailed ? (
          <InlineError
            title="Referrals couldn't be loaded"
            message={errorText(query.error) ?? 'Referrals could not be loaded. Try again.'}
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {laterPageFailed ? (
          <InlineError
            title="More referrals couldn't be loaded"
            message={`${errorText(query.error) ?? 'Could not load more referrals.'} The referrals above are still loaded.`}
            onRetry={() => void query.fetchNextPage()}
          />
        ) : null}

        {items && items.length === 0 ? (
          <EmptyState
            title={emptyTitle(view)}
            description="Referrals from other doctors appear here as soon as they are sent."
            action={
              view === 'all'
                ? { label: 'Back to the doctor area', to: '/doctor' }
                : { label: 'View all referrals', onClick: () => setView('all') }
            }
          />
        ) : null}

        {items && items.length > 0 ? (
          <>
            <ul className={styles.list}>
              {items.map((referral) => (
                <ReferralListItem key={referral.id} referral={referral} />
              ))}
            </ul>
            {query.hasNextPage ? (
              <Button
                variant="secondary"
                onClick={() => query.fetchNextPage()}
                loading={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? 'Loading more…' : 'Load more referrals'}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
