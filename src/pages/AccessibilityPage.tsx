import { Link } from 'react-router-dom';
import { PublicCallout, PublicPage } from '../components/PublicPage';

export function AccessibilityPage() {
  return (
    <PublicPage path="/accessibility">
      <PublicCallout title="Living statement — last reviewed October 2026">
        <p>
          This statement covers the DocForum web application as deployed in this public preview.
          Accessibility here means WCAG 2.2 level AA as the working target: it is a goal this
          project is building toward and measuring, not a certification it has earned.
        </p>
      </PublicCallout>

      <h2>What we build in</h2>
      <ul>
        <li>
          <strong>Semantic structure.</strong> Pages use real landmarks (<code>header</code>,{' '}
          <code>main</code>, <code>footer</code>), one <code>h1</code> per page with headings
          nested in order, lists for lists, tables with headers and captions, and labels tied to
          every input.
        </li>
        <li>
          <strong>Keyboard operation.</strong> Every control — buttons, links, tabs, switches,
          dialogs, tables — is reachable and operable with the keyboard. The doctor command palette
          moves focus into its input when it opens and closes on Escape; dialogs are labelled with{' '}
          <code>aria-labelledby</code>.
        </li>
        <li>
          <strong>Visible focus.</strong> Form fields show a 3px focus ring on focus; tabs,
          switches, palette options and links draw an explicit focus outline. No control hides its
          focus indicator without a replacement.
        </li>
        <li>
          <strong>Announced state.</strong> Loading states are exposed as <code>role="status"</code>,
          errors as <code>role="alert"</code> and <code>aria-invalid</code> with{' '}
          <code>aria-describedby</code>, pending buttons carry <code>aria-busy</code>, and
          decorative artwork is <code>aria-hidden</code>.
        </li>
        <li>
          <strong>Motion preferences.</strong> Entrance animations only run under{' '}
          <code>prefers-reduced-motion: no-preference</code>; spinners slow or stop under reduced
          motion; animated transitions are switched off in CSS for those users. Content is never
          hidden waiting for an animation — if animation setup fails, the text stays visible.
        </li>
        <li>
          <strong>Contrast and themes.</strong> Light, dark, and a dedicated high-contrast theme
          (chosen automatically from your system preference, or set explicitly and remembered).
        </li>
        <li>
          <strong>Data that reads as data.</strong> Practice-insight charts ship with full table
          alternatives — semantic captions, header cells, and tabular numeric alignment — so no
          figure is only a picture.
        </li>
        <li>
          <strong>Responsive and zoomable.</strong> Layouts reflow to narrow phone widths and use
          relative units, so 200% zoom and small screens don't clip content.
        </li>
      </ul>

      <h2>Known limitations</h2>
      <p>We would rather publish these than imply an audit that has not happened:</p>
      <ul>
        <li>
          No independent accessibility audit or automated accessibility test suite runs in CI yet —
          component-level accessibility tests are planned with the Storybook workstream, and
          Lighthouse integration with the performance-budget workstream.
        </li>
        <li>There is no skip-to-content link; keyboard users tab through the header on every page.</li>
        <li>
          Focus is not always returned to the control that opened a dialog, dialog focus is not
          trapped yet, and the shortcuts dialog does not close on Escape (it has a Close button).
        </li>
        <li>
          The facility finder's map is a visual layer: markers are not individually keyboard
          focusable. The same results are always available as an adjacent, labelled list.
        </li>
        <li>
          Scan-to-verify needs a device camera; manual token entry is the supported alternative.
        </li>
        <li>
          Contrast ratios have been designed against the token palette but not independently
          verified by a third-party audit.
        </li>
        <li>
          A few screens are still under construction and show preview/placeholder copy while their
          real data lands.
        </li>
      </ul>

      <h2>Feedback</h2>
      <p>
        If something here blocks you, tell us: open an issue on the{' '}
        <a href="https://github.com/DocForum/docforum-web/issues">project issue tracker</a> with the
        page, what you were trying to do, and the assistive technology or input you used. Barriers
        get fixed as product work, and this statement is updated when they do.
      </p>

      <p>
        <Link to="/privacy">Privacy</Link> · <Link to="/faq">FAQ</Link> ·{' '}
        <Link to="/how-it-works">How it works</Link>
      </p>
    </PublicPage>
  );
}
