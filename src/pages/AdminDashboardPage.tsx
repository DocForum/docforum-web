import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { CreatePaymentIntentForm } from '../features/payments/components/CreatePaymentIntentForm';
import { PaymentIntentPanel } from '../features/payments/components/PaymentIntentPanel';
import { TextField } from '../components/TextField';

// v1: admin accounts are invited/seeded directly, not self-serve — there's
// no admin signup flow anywhere in this repo or docforum-core, by design
// (PRD OQ-2). This page is real once an admin session exists.
export function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  // `?intent=<id>` opens an intent directly — the audit trail links here.
  const [searchParams] = useSearchParams();
  const linkedIntentId = searchParams.get('intent')?.trim() || null;
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(linkedIntentId);
  const [lookupId, setLookupId] = useState(linkedIntentId ?? '');

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome{user ? `, ${user.email}` : ''}</h1>
        <p>
          Payments console (Phase W5) — creates and drives real{' '}
          <a href="https://github.com/DocForum/docforum-core/blob/main/docs/adr/0004-custodial-payments-v1.md">
            custodial escrow payments
          </a>{' '}
          on Stellar testnet, entirely through docforum-core's API.
        </p>
        <p>
          <Link to="/admin/referrals">Review stuck referrals</Link> to reassign or cancel referrals that have sat
          pending too long.
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

      <CreatePaymentIntentForm onCreated={setSelectedIntentId} />

      <div className="card">
        <h2>Look up an existing payment intent</h2>
        <TextField
          label="Payment intent id"
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSelectedIntentId(lookupId);
          }}
        />
      </div>

      {selectedIntentId && <PaymentIntentPanel intentId={selectedIntentId} />}
    </div>
  );
}
