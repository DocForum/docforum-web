import { Link } from 'react-router-dom';
import { PublicCallout, PublicPage } from '../components/PublicPage';

export function FaqPage() {
  return (
    <PublicPage path="/faq">
      <PublicCallout title="Public preview">
        <p>
          This deployment is a preview of DocForum, not a production health service. Data in it can
          be reset. See “Is this production?” below.
        </p>
      </PublicCallout>

      <h2>What is DocForum?</h2>
      <p>
        A web platform that keeps a hospital journey in one thread: find a doctor by real
        availability, book with a structured intake, get referred with the context already
        attached, receive structured prescriptions and lab orders, and fulfil them at a chosen lab
        or pharmacy whose payment releases only on confirmed fulfillment.{' '}
        <Link to="/how-it-works">The full flow is described step by step here</Link>.
      </p>

      <h2>Is this production?</h2>
      <p>
        No. This is a public front-end preview connected to a preview backend: accounts, data, and
        the database behind them are disposable and may be reset. Do not rely on it for real
        medical records or anything you cannot afford to lose, and do not treat anything on this
        site as a certification, compliance claim, uptime promise, or pricing offer.
      </p>

      <h2>Who can create an account?</h2>
      <p>
        Patients and doctors self-register — those are the two self-serve roles. Lab, pharmacy and
        clinic <strong>facility accounts are invited by an administrator</strong>, and
        administrator accounts are seeded/invited too. Login works for every role; sign-up does not
        offer facility registration by design.
      </p>

      <h2>Do doctors have to be verified?</h2>
      <p>
        Yes. Only verified doctors can appear in patient search, verification is manual and
        administrator-gated for version one, and specialties come from a controlled vocabulary
        rather than free text. Signing up does not by itself list a doctor.
      </p>

      <h2>Does DocForum replace emergency care?</h2>
      <p>
        No — and it is an explicit non-goal. DocForum is not an emergency or ambulance-dispatch
        service and not a substitute for in-person medical judgement. For emergencies, contact your
        local emergency number.
      </p>

      <h2>Is there a mobile app?</h2>
      <p>
        Version one is a responsive web app that works in a mobile browser; a native app wrapper is
        a later phase, not something available today.
      </p>

      <h2>How much does it cost?</h2>
      <p>
        No pricing is published for this preview, and consultation pricing is explicitly out of
        scope for version one in the product requirements. Payments that do exist in the product
        concern facility fulfillment, held in escrow until the work is confirmed — on Stellar
        <strong> testnet</strong> in this preview.
      </p>

      <h2>Can I book for my child or someone I care for?</h2>
      <p>
        Yes, if you are their guardian: add them as a dependent, book and view records on their
        behalf with the acting-for switcher, and hand the account over when they come of age. The
        dependents and health-profile screens are live in this preview.
      </p>

      <h2>How is my health data handled?</h2>
      <p>
        Intake and consultation notes are visible to you, the treating doctors in that care thread,
        and the fulfilling facility for that specific order — not the whole platform. Sessions stay
        in memory, location never leaves the browser, and there are no advertising or analytics
        scripts. The details, including the draft status of this notice, are on the{' '}
        <Link to="/privacy">privacy page</Link>.
      </p>

      <h2>Can I get my data out or delete my account?</h2>
      <p>
        Both, from account settings: a password-confirmed machine-readable export (available for 24
        hours once ready), and account deletion with a typed confirmation — identity details are
        scrubbed, while clinical and payment records are retained de-identified to meet statutory
        retention. Deletion waits if you still have active orders or unreleased funded escrow.
      </p>

      <h2>What actually works right now?</h2>
      <p>
        Accounts, the patient health profile and dependents, the care thread timeline, the facility
        finder, the doctor queue and consultation notes, the messages inbox, practice insights, and
        the facility workspace (verify, queue, team, payouts). Still building: patient doctor
        search and booking screens, the appointment list, and the referral accept screen — all on
        the{' '}
        <a href="https://github.com/DocForum/docforum-web/blob/main/ROADMAP.md">public roadmap</a>.
      </p>

      <h2>Who can see the code?</h2>
      <p>
        It is an open-source project under the Apache 2.0 license — you can read this frontend and
        its backend, file issues, and check any claim on this site against the code.
      </p>

      <p>
        <Link to="/for-doctors">For doctors</Link> · <Link to="/for-facilities">For facilities</Link>{' '}
        · <Link to="/accessibility">Accessibility statement</Link> ·{' '}
        <Link to="/signup">Sign up</Link>
      </p>
    </PublicPage>
  );
}
