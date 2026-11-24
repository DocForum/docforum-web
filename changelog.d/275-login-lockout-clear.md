Admins can clear a user's login lockout from `/admin/system`
([issue #275](https://github.com/DocForum/docforum-web/issues/275)). The panel
validates the email, asks for confirmation, and calls the real
`POST /auth/login-attempts/clear`; the response reports only how many throttle
buckets were cleared, so it cannot reveal whether an account exists. No
free-text reason is collected because docforum-core's audit trail records the
acting admin and does not accept one.
