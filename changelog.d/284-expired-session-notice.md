Session expiry notice on login page (issue #284).

When a previously authenticated user's session expires and a refresh attempt
fails with HTTP 401 or 403, the login page now displays a notice explaining
that the session has expired. The notice:

- Uses the existing translation system (English: "Your session has expired —
  you have been signed out. Anything you hadn't saved is gone; sign in again to
  continue.").
- Is accessible (role="status").
- Appears alongside the existing idle-timeout notice without confusing the two
  reasons.
- Is not displayed on a fresh visit where no refresh cookie/session exists.

The sign-out reason 'session-expired' is set by the shared sign-out helper when
a refresh fails, and cleared on successful login via setSession.

Closes #284.