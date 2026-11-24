Phase W6: admin user management at `/admin/users`
([issue #70](https://github.com/DocForum/docforum-web/issues/70)). Search by
email or name, role/status filters and pagination are URL-synced; the detail
dialog shows role, status and live session count, deactivation requires a
10–500 character reason with a second confirmation, accounts can be
reactivated, and admin invites can be sent, listed and revoked. The
last-active-admin guard is surfaced as its own explanation. Assumed shapes
pending docforum-core#39.
