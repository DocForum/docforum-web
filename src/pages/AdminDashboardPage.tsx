import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { CreatePaymentIntentForm } from '../features/payments/components/CreatePaymentIntentForm';
import { PaymentIntentPanel } from '../features/payments/components/PaymentIntentPanel';
import { TextField } from '../components/TextField';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useT } from '../i18n/useT';

// v1: admin accounts are invited/seeded directly, not self-serve — there's
// no admin signup flow anywhere in this repo or docforum-core, by design
// (PRD OQ-2). This page is real once an admin session exists.
export function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const linkedIntentId = searchParams.get('intent')?.trim() || null;
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(linkedIntentId);
  const [lookupId, setLookupId] = useState(linkedIntentId ?? '');
  const t = useT();

  return (
    <div className="container">
      <div className="card">
        <h1>{t('admin.welcome', 'Welcome, {email}', { email: user?.email ?? '' })}</h1>
        <p>
          {t('admin.consoleIntro', 'Payments console (Phase W5) — creates and drives real')}{' '}
          <a href="https://github.com/DocForum/docforum-core/blob/main/docs/adr/0004-custodial-payments-v1.md">
            {t('admin.custodialEscrow', 'custodial escrow payments')}
          </a>{' '}
          {t('admin.consoleOutro', "on Stellar testnet, entirely through docforum-core's API.")}
        </p>
        <p>
          <Link to="/admin/verifications">Review doctor verifications</Link> to approve or reject doctors waiting
          for credential review — unverified doctors never appear in search.
        </p>
        <p>
          <Link to="/admin/verification">Review specialty claims</Link> to approve or reject each doctor's claimed
          specialties one at a time, with the supporting credential beside each claim.
        </p>
        <p>
          <Link to="/admin/referrals">Review stuck referrals</Link> to reassign or cancel referrals that have sat
          pending too long.
        </p>
        <p>
          <Link to="/admin/disputes">Resolve fulfilment disputes</Link> to release or refund escrow that is blocked
          while a patient disputes a fulfilled order.
        </p>
        <p>
          <Link to="/admin/audit">Open the audit trail</Link> to see who changed or viewed any record.
        </p>
        <p>
          <Link to="/admin/flags">Manage feature flags</Link> to stage rollouts like wallet payments or 2FA enforcement.
        </p>
        <p>
          <Link to="/admin/system">Check system health</Link> for readiness, background jobs and outbox dead letters.
        </p>
      </div>

      <ErrorBoundary level="section">
        <CreatePaymentIntentForm onCreated={setSelectedIntentId} />
      </ErrorBoundary>

      <div className="card">
        <h2>{t('admin.lookupTitle', 'Look up an existing payment intent')}</h2>
        <TextField
          label={t('admin.paymentIntentId', 'Payment intent id')}
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSelectedIntentId(lookupId);
          }}
        />
      </div>

      {selectedIntentId && (
        <ErrorBoundary level="section">
          <PaymentIntentPanel intentId={selectedIntentId} />
        </ErrorBoundary>
      )}
    </div>
  );
}
