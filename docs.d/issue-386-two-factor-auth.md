---
file: ARCHITECTURE_ESSENTIALS.md
section: Where things live
---
### Phase W1 — Two-factor sign-in and enrollment

`POST /auth/login` can return a normal session, `{mfaRequired, mfaToken}`, or
`{enrollmentRequired, enrollmentToken}`. Challenge tokens stay in the login
component tree. `POST /auth/2fa/verify` exchanges a TOTP or recovery code for
a normal session. An admin required to enroll uses the enrollment token for
setup and enable, saves the one-time recovery codes, then returns to password
sign-in to complete MFA; enrollment itself does not create a session.

Signed-in users manage enrollment through `GET /auth/2fa/status`,
`POST /auth/2fa/setup`, `POST /auth/2fa/enable`, and `POST /auth/2fa/disable`
from account security settings. TOTP secrets and recovery codes remain in
component state; the setup QR is generated client-side from `otpauthUri`.
Neither challenge tokens nor secrets or recovery codes are persisted. The
client preserves the current session on `INVALID_TOTP_CODE` and treats
`INVALID_MFA_TOKEN` as an expired sign-in challenge, not session expiry.
