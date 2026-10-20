import { Link } from 'react-router-dom';
import { PublicCallout, PublicPage } from '../components/PublicPage';

export function HowItWorksPage() {
  return (
    <PublicPage path="/how-it-works">
      <p>
        DocForum collapses a multi-visit hospital journey into one continuous thread. A symptom
        becomes a booking, a referral, a structured prescription or lab order, and a settled
        fulfillment — without the patient re-explaining themselves at every desk.
      </p>

      <PublicCallout title="This site is a public preview">
        <p>
        The flow below is how the product is designed to work end to end. Not every screen in
        it ships yet — see <strong>“What works in the preview today”</strong> below for what you
        can use right now, and the{' '}
        <a href="https://github.com/DocForum/docforum-web/blob/main/ROADMAP.md">project roadmap</a>{' '}
        for the rest. Nothing here is a certification, a regulatory claim, or a service-level
        guarantee.
        </p>
      </PublicCallout>

      <h2>The flow</h2>
      <ol className="steps">
        <li>
          <h3>Create an account</h3>
          <p>
            Patients and doctors sign up themselves and get separate roles with separate
            capabilities. Lab, pharmacy and clinic accounts are <strong>invited by an
            administrator</strong> rather than self-registered, which keeps fulfillment tied to a
            curated partner list.
          </p>
        </li>
        <li>
          <h3>Find a doctor by specialty and real availability</h3>
          <p>
            Patients search by specialty and open time slots. Only <strong>verified doctors</strong>{' '}
            appear in search results, and verification is manual and administrator-gated for
            version one — specialty is a controlled vocabulary, not free text.
          </p>
        </li>
        <li>
          <h3>Book with a structured intake</h3>
          <p>
            A booking requires a structured description of the issue — symptoms, duration,
            severity — before it is confirmed, not a blank free-text box. Slots are claimed with a
            conditional database update, so two patients racing for the same slot can never both
            win: double-booking is treated as a defect class, not a retry.
          </p>
        </li>
        <li>
          <h3>Consult with the context already there</h3>
          <p>
            The doctor sees the intake and the care history before the visit, writes consultation
            notes, and closes the consultation as <em>resolved</em>, <em>referred</em>, or{' '}
            <em>needs follow-up</em>.
          </p>
        </li>
        <li>
          <h3>Refer without starting over</h3>
          <p>
            A referral carries the original intake, the consultation notes, the referring doctor's
            identity, and the target specialty. The patient confirms the referral, and the new
            booking is pre-populated — nobody re-types the same history at the next desk.
          </p>
        </li>
        <li>
          <h3>Issue structured orders</h3>
          <p>
            Prescriptions are structured (drug, dosage, frequency, duration) and lab orders specify
            test type and urgency, so a pharmacy or lab can act on them unambiguously. Each order
            belongs to exactly one prescribing doctor and one patient, and is immutable once issued
            — corrections create a new version rather than editing history.
          </p>
        </li>
        <li>
          <h3>Fulfill, confirm, settle</h3>
          <p>
            The patient picks a qualified lab or pharmacy for that specific order. The facility
            fulfills it (labs can attach results), the fulfillment is confirmed, and the facility's
            payment — held in escrow until then — is released. Results become visible to the
            patient and the ordering doctor.
          </p>
        </li>
      </ol>

      <h2>What works in the preview today</h2>
      <p>
        This deployment is a front-end preview connected to a preview backend. Currently usable:
      </p>
      <ul>
        <li>
          <strong>Accounts and sessions</strong> — patient and doctor self-serve sign-up, login for
          every role, logout, account settings.
        </li>
        <li>
          <strong>Patient tools</strong> — health profile (allergies, conditions, medications),
          dependents with guardian handover, booking and viewing on behalf of a dependent, the care
          thread timeline, the facility finder with distance sorting, data export and account
          deletion.
        </li>
        <li>
          <strong>Doctor tools</strong> — today's appointments and live queue with start/complete
          and a running-delay override, consultation notes with sign-off and addenda, a messages
          inbox across patient threads, and private practice insights.
        </li>
        <li>
          <strong>Facility tools</strong> — staff invitations, scan-to-verify at the counter, a
          fulfillment queue that attributes every action, and a payout ledger with plain-language
          escrow terms (Stellar <strong>testnet</strong>).
        </li>
        <li>
          <strong>Payments</strong> — wallet linking and escrow status, always read from DocForum's
          own API.
        </li>
      </ul>
      <p>
        Not yet: the patient-facing doctor search and booking screens, the appointment list, the
        referral accept screen, and the patient orders list — all open on the roadmap.
      </p>

      <h2>Why it is built this way</h2>
      <ul className="plain">
        <li>
          <strong>Privacy by scope.</strong> Intake and consultation notes are visible to the
          patient, the treating doctors in that care thread, and the fulfilling facility for that
          specific order — not to the whole platform.
        </li>
        <li>
          <strong>Auditability.</strong> Every state change on a referral, prescription, or lab
          order records who changed it and when, because this is health data.
        </li>
        <li>
          <strong>Data integrity over convenience.</strong> Orders are append-only and versioned;
          availability claims are enforced in the database, not in UI code.
        </li>
      </ul>

      <h2>Next steps</h2>
      <p>
        New here? Read the <Link to="/faq">FAQ</Link>, or see <Link to="/for-doctors">DocForum for
        doctors</Link> and <Link to="/for-facilities">DocForum for facilities</Link>. Ready to try
        it? <Link to="/signup">Create an account</Link> or <Link to="/login">log in</Link>.
      </p>
    </PublicPage>
  );
}
