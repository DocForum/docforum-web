Phase W7: active sessions and Retry-After lockout UX
([issue #79](https://github.com/DocForum/docforum-web/issues/79),
[issue #80](https://github.com/DocForum/docforum-web/issues/80)).
Account settings lists the user's sessions from docforum-core's
`GET /auth/sessions` with a coarse "OS · Browser" label (the IP address the API
returns is never shown) and can revoke one session or every other session. A
`429` becomes a typed `RateLimitError`; login and signup show an
account-agnostic countdown and keep submit disabled until `Retry-After` passes,
the app shell shows one global notice, and React Query never retries a 429
sooner than the server allows.
