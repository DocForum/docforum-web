import { Link } from 'react-router-dom';
import { PublicCallout, PublicPage } from '../components/PublicPage';

export function ForFacilitiesPage() {
  return (
    <PublicPage path="/for-facilities">
      <p>
        Labs, pharmacies, and clinics that fulfill DocForum orders get a workspace built around
        one job: receive an unambiguous order, prove it was fulfilled by a named person at a named
        time, and get paid when the work is confirmed — not before.
      </p>

      <PublicCallout title="Invitation only, and running on testnet">
        <p>
          Facility accounts are created by a platform administrator — there is no self-serve
          facility sign-up — so the partner list stays curated. Escrow payments in this preview
          run on Stellar <strong>testnet</strong> with disposable assets; nothing here is a
          production payment promise.
        </p>
      </PublicCallout>

      <h2>Verify an order at the counter</h2>
      <p>
        A patient presents a fulfillment token; scan it with the device camera or type it in by
        hand. The check answers with an explicit state — valid, superseded, expired, already
        fulfilled, or not eligible for this facility — plus the order details a counter needs:
        what to dispense, the instructions, and when it was issued. Repeated bad guesses are
        rate-limited, and the camera feed is released the moment you leave the screen.
      </p>

      <h2>A fulfillment queue that remembers who acted</h2>
      <p>
        Every item in the queue carries its history: which staff member performed which action,
        in which role, when, and with what notes. That attribution is the audit trail the product
        requires for health data — fulfillment is never an anonymous status flip. Queue items are
        scoped to your facility; one facility never sees another's orders.
      </p>

      <h2>Staff accounts with real roles</h2>
      <ul>
        <li>Owners invite staff by email with a fixed role — owner or staff — and can resend or revoke pending invitations.</li>
        <li>Staff members see the team page read-only: no inviting, no revoking.</li>
        <li>Removing a member immediately revokes their active sessions, and the last owner cannot remove themselves into an ownerless facility.</li>
      </ul>

      <h2>Payouts you can actually read</h2>
      <p>
        The payout ledger lists escrow deposits, releases, and refunds per order, with totals for
        held, released, and refunded funds in each asset. Amounts are formatted exactly for
        Stellar's 7-decimal stroops, escrow terms are spelled out in plain language — who can
        release, by when the refund deadline falls — and unfulfilled orders approaching that
        deadline are flagged before they become a dispute. Transactions link out to the Stellar
        testnet explorer so you can verify the chain yourself.
      </p>

      <h2>What a facility does not get</h2>
      <p>
        No self-serve registration, no access to records beyond the specific orders your facility
        fulfills, and no payment ahead of confirmed fulfillment. The patient's full care history
        stays with the patient and their treating doctors; you see what your order requires.
      </p>

      <p>
        <Link to="/login">Log in to your facility account</Link> ·{' '}
        <Link to="/how-it-works">See how the whole flow works</Link> ·{' '}
        <Link to="/privacy">Privacy</Link>
      </p>
    </PublicPage>
  );
}
