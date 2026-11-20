---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Account deletion against the real API (issue #260)

`docforum-core` #41 has landed, so this is no longer an assumption:

- `DELETE /patients/me` (patient, bearer token) with body `{password}` →
  `204 No Content`. The typed `DELETE` phrase is a client-side safeguard
  only and is never sent.
- A wrong password is `403 PASSWORD_CONFIRMATION_FAILED`; the UI renders it
  on the password field, not as a form-level error. Repeated wrong passwords
  count against docforum-core's login throttle, so a `429` honours
  `Retry-After`.
- `204` is success with no body: the client clears the React Query cache,
  the Zustand session and the acting-profile state, then redirects to
  `/account-deleted`. A repeat request is idempotent (core returns `204`
  again).
- Guardians may delete their account. Core revokes every guardianship in
  the same transaction and leaves dependents' profiles and appointments
  untouched, so the UI does not block deletion for a guardian with active
  dependents.
