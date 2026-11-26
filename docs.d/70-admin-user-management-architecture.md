---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Phase W6 — Admin user management (issue #70, assumed docforum-core#39)

- `GET /admin/users?search=&role=&status=&page=&pageSize=` → `{items, total, page, pageSize}` (`AdminUserPage`). Only `search`, `role` and `status` are sent when meaningful; `pageSize` is 10.
- `AdminUser` = `{id, email, fullName, role, status: active | deactivated, activeSessionCount, createdAt, lastActiveAt?, deactivatedAt?, deactivationReason?}`. The client shows no clinical data and no other PII.
- `GET /admin/users/:id` → `AdminUser` (the dialog can render from the list row; the detail call exists for a future direct link).
- `POST /admin/users/:id/deactivate` (body `{reason}`, 10–500 characters) → `AdminUser`. A `409` with code `LAST_ADMIN` (or a 409 message naming the last admin — the live envelope only carries `{message}`) means the last active admin cannot be disabled, and the UI says so explicitly.
- `POST /admin/users/:id/reactivate` → `AdminUser`.
- `GET /admin/invites` → `AdminInvite[]`; `POST /admin/invites` (body `{email}`) → `AdminInvite` (`409` for a duplicate pending invite); `DELETE /admin/invites/:id` → `{success}`.

Search, role, status and page live in the URL (`q`, `role`, `status`, `page`); values outside the allowed sets are discarded before any request. Deactivation is never optimistic: the row updates only after the server confirms, because a silently failed deactivation is a security problem.
