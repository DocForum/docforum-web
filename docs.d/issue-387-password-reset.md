### Phase W1 — Password reset

The web client uses `POST /auth/password-reset/request` with `{email}` and `POST /auth/password-reset/confirm` with `{token, newPassword}`. These routes are implemented in `docforum-core`'s `backend/src/modules/auth/routes/index.ts`, `controllers/index.ts`, `services/password-reset.ts`, and `validation.ts`; the API contract is not yet listed in core's `docs/api/README.md`. Request success is intentionally presented with the same neutral copy for known and unknown emails. Confirmation errors use a single invalid-or-expired message. The reset token is read into component memory and removed from the visible URL using a replace navigation; a successful reset clears the in-memory session.

The deployment uses `HashRouter`. A path-style email link such as `/reset-password?token=…` still depends on GitHub Pages path deep-link handling (tracked separately as issue #305); this change adds the route but does not implement that hosting behavior.
