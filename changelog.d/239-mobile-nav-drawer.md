Phase W7: the mobile navigation drawer is now a real modal dialog when open
and completely inert when closed, so its links are no longer reachable by Tab
while it is hidden (aria-hidden-focus, aria-modal on a nav). Closes issue
#239.

`src/components/Layout.tsx` marks the closed drawer `inert` and every part of
the page behind the open drawer `inert`; the open drawer is a labelled
`role="dialog"` ("Mobile navigation menu") that contains the labelled nav,
uses the shared `useFocusTrap` so focus cannot escape and links added later
are still covered, closes on Escape, and returns focus to the menu toggle.
`src/components/Layout.test.tsx` asserts the closed drawer's `inert` attribute
(happy-dom does not implement inert) and that Tab wraps inside the open dialog
with Escape restoring focus to the toggle; `e2e/accessibility.spec.ts`
confirms the tab order and axe (`aria-hidden-focus`) at phone width in both
states.
