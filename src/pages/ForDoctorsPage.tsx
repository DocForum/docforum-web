import { Link } from 'react-router-dom';
import { PublicCallout, PublicPage } from '../components/PublicPage';

export function ForDoctorsPage() {
  return (
    <PublicPage path="/for-doctors">
      <p>
        DocForum is built for the first-contact doctor who needs to triage quickly and refer
        confidently, and the specialist who needs the full picture the moment a patient arrives.
        The context travels with the patient instead of a phone call or a paper note.
      </p>

      <PublicCallout title="Preview status">
        <p>
          Everything on this page that says “today” exists in this preview. Patient-facing search
          and booking screens are still being built (see the{' '}
          <a href="https://github.com/DocForum/docforum-web/blob/main/ROADMAP.md">roadmap</a>), so
          new bookings arrive as the platform grows rather than from a finished patient app.
        </p>
      </PublicCallout>

      <h2>Today, in one queue</h2>
      <p>
        Your dashboard opens on today's appointments and a live queue of checked-in patients:
      </p>
      <ul>
        <li>Start and complete visits; each action can be undone during a short undo window.</li>
        <li>
          See intake before the patient sits down, and set a “running late by N minutes” override
          that the queue reflects — clearable the moment you catch up.
        </li>
        <li>Keyboard shortcuts and a command palette for jumping between queue, inbox, and consultation.</li>
      </ul>

      <h2>Consultation records that travel</h2>
      <p>
        A consultation closes with a structured outcome — <em>resolved</em>, <em>referred</em>, or{' '}
        <em>needs follow-up</em>. Notes are signed off, after which the record is immutable;
        corrections are append-only addenda, never silent edits. A referral carries the original
        intake, your notes, your identity and the target specialty, so the specialist starts from
        context instead of a blank form — and the patient never re-enters it.
      </p>

      <h2>An inbox across every patient thread</h2>
      <p>
        Messages from every patient you are treating land in one inbox, oldest-unanswered first,
        with unread counts. Message previews are deliberately kept short because they can contain
        patient-identifying detail, and filters let you narrow the list without scrolling history.
      </p>

      <h2>Practice insights that stay yours</h2>
      <p>
        Weekly slot utilisation, no-show and late-cancellation rates, referral turnaround, and
        message response times — scoped strictly to your own practice. There are no named peer
        comparisons anywhere in the product, and small samples are flagged so a handful of slots
        never gets presented as a trend. Every chart has a full table alternative for screen
        readers.
      </p>

      <h2>Verification comes before visibility</h2>
      <p>
        Only <strong>verified doctors</strong> appear in patient search results. Verification is
        manual and administrator-gated for version one — a doctor's specialties come from a
        controlled vocabulary rather than free text, so a patient searching for cardiology never
        lands on a profile that does not practise it. Being signed up is not the same as being
        listed.
      </p>

      <h2>Joining</h2>
      <p>
        Create a doctor account from the sign-up screen (patients and doctors self-register;
        facility and administrator accounts are invited). Verification is handled by a platform
        administrator, not by a self-attested form.
      </p>
      <p>
        <Link to="/signup">Create a doctor account</Link> · <Link to="/login">Log in</Link> ·{' '}
        <Link to="/how-it-works">How the whole flow works</Link>
      </p>
    </PublicPage>
  );
}
