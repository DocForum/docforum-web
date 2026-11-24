## Email verification (issue #388)

The web app now mirrors `User.emailVerifiedAt`, consumes single-use
`POST /auth/verify-email` tokens without persisting them, and supports
authenticated `POST /auth/verify-email/resend` with the server retry delay.
The verification screen removes the token from the URL and guards the
single-use call against React StrictMode replay. Signed-in users with a
null `emailVerifiedAt` see a dismissible resend banner; a 409
`EMAIL_ALREADY_VERIFIED` updates their in-memory user state.

The app's current `HashRouter` does not support core's path-style
`/verify-email?token=…` email link on GitHub Pages. Path deep-link handling
is out of scope and tracked by issue #305.
