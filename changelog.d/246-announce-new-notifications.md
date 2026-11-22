Phase W7: new notifications are announced to screen readers, and icon-only
header controls have a consistent target size
([issue #246](https://github.com/DocForum/docforum-web/issues/246), WCAG 4.1.3
and 2.5.8). When the bell's unread count goes up, a permanently mounted polite
live region says "N new notifications. M unread." once per burst
(`useNewNotificationAnnouncement`, batched through `useAnnouncer`). The count
from the initial load and any decrease (mark read, mark all read) are never
announced, and switching account starts from a fresh baseline. `useAnnouncer`
now accepts a function resolved when the batch flushes, and re-announces a
batch that reads the same as the previous one. The drawer close button uses an
`aria-hidden` SVG instead of the "✕" text glyph and keeps its label. It and the
language switcher are now 36px like the bell and menu toggle (the close button
was 25×28 and the switcher 32px tall). The mock API panel has a "Simulate a new
notification" button for checking the announcement.
