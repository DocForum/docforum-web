Phase W3: one unread message count, on the Messages nav item
([issue #235](https://github.com/DocForum/docforum-web/issues/235)).
`doctorNavItems` now declares `badgeKey: 'unreadMessages'` instead of the
hard-coded `badge: 0`, and `Layout` fills it from `useUnreadMessageCount`,
which reads the same `useMessageThreads` query as the inbox. The separate
badge next to the user chip and the dashboard-header badge are gone, along
with the `UnreadBadge` component and its `messaging.unreadLabel` string.
The count keeps updating from `message.created` because
`useRealtimeCacheSync` invalidates the threads query. Both the desktop nav
and the mobile drawer show the badge, capped at 99+.
