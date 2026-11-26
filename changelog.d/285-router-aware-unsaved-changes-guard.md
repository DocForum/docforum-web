Router-aware unsaved-changes guard (issue #285).

Replaced the two existing unsaved-changes guard implementations with one
reusable hook (`useUnsavedChangesGuard`) that protects dirty forms against:

- In-app navigation blocking (links, programmatic navigate(), back/forward,
  command palette) via React Router's useBlocker.
- Browser tab close/refresh protection via beforeunload.
- Shared accessible Dialog component (replaces window.confirm).
- Shared unsaved-changes store updates (idle-timeout warning continues to work).

The shared hook was migrated to three editors:

1. Facility settings — FacilitySettingsView now uses the shared guard.
2. Consultation notes — ConsultationNote now uses the shared guard to protect
   draft content.
3. Health profile — HealthSection now uses the shared guard instead of the
   old useUnsavedChangesWarning hook.

Key design decisions:

- The app uses createBrowserRouter (data router), so useBlocker is supported
  without a router migration.
- The guard explicitly bypasses forced authentication transitions: expired
  session sign-out, idle-timeout sign-out, and auth redirects to /login cannot
  become trapped behind the dialog.
- Multiple dirty forms each maintain independent state via the shared store.
- On successful save, the form is marked clean and navigation blocking is
  removed.

Closes #285.