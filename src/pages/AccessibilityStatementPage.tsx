import { Link } from 'react-router-dom';
import styles from './AccessibilityStatementPage.module.css';

const LAST_REVIEWED = '2026-10-18';

/**
 * Public accessibility statement (issue #89). Kept factual: it describes
 * what has actually been tested in this repo and names what has not (a
 * manual NVDA/VoiceOver pass), instead of claiming full conformance.
 */
export function AccessibilityStatementPage() {
  return (
    <div className="container">
      <div className="card">
        <h1>Accessibility statement</h1>
        <p>
          DocForum is a care-continuity platform used by patients, doctors and facility staff. We
          want everyone to be able to book care, read their records and run a clinic, including
          people who use a keyboard, a screen reader, magnification or reduced motion.
        </p>

        <section className={styles.section} aria-labelledby="conformance-heading">
          <h2 id="conformance-heading">Conformance status</h2>
          <p>
            The patient, auth, doctor, facility and admin screens aim to meet{' '}
            <a href="https://www.w3.org/TR/WCAG22/">WCAG 2.2 level AA</a>. We are{' '}
            <strong>partially conformant</strong>: automated and keyboard checks pass for the
            flows covered below, but a full manual screen-reader audit has not been completed yet,
            so we do not claim full conformance.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="measures-heading">
          <h2 id="measures-heading">How we check</h2>
          <ul className={styles.list}>
            <li>
              <strong>Automated:</strong> every component test suite runs axe checks
              (<code>jest-axe</code>) against the rendered auth, patient, doctor, facility and
              admin surfaces.
            </li>
            <li>
              <strong>Keyboard-only:</strong> dialogs trap and restore focus, Escape closes them,
              tables and forms are reachable in order, and every interactive control is a native
              button, link or labelled input.
            </li>
            <li>
              <strong>Structure:</strong> data tables have captions and row/column headers; live
              queue updates are announced politely and batched rather than one message per row.
            </li>
            <li>
              <strong>Preferences:</strong> <code>prefers-reduced-motion</code> is respected by
              every animation, and the interface can be switched to a right-to-left locale
              (<Link to="/accessibility">use the Locale control in the footer</Link>).
            </li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="limitations-heading">
          <h2 id="limitations-heading">Known limitations</h2>
          <ul className={styles.list}>
            <li>
              A manual NVDA and VoiceOver pass on the live deployment is still outstanding. The
              fixes in this release were verified with automated axe rules and keyboard tests; a
              human screen-reader review is tracked in the repository.
            </li>
            <li>
              The facility map uses third-party OpenStreetMap tiles, which are decorative
              (<code>alt=&quot;&quot;</code>); the same facilities are available as a text list
              with distance and address, and markers are keyboard operable.
            </li>
            <li>
              Wide clinical tables scroll horizontally on narrow screens; each table has a caption
              and headers so screen readers keep the association.
            </li>
            <li>
              The locale switcher changes date, number and amount formatting and the layout
              direction. It is not a full translation of the product; untranslated copy remains in
              English.
            </li>
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="feedback-heading">
          <h2 id="feedback-heading">Feedback</h2>
          <p>
            If something blocks you, please{' '}
            <a
              href="https://github.com/DocForum/docforum-web/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              open an accessibility issue
            </a>{' '}
            and tell us the screen, the assistive technology and what happened. We aim to
            acknowledge accessibility reports within five working days.
          </p>
        </section>

        <p className={styles.reviewed}>
          Last reviewed: <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>
        </p>
      </div>
    </div>
  );
}
