Phase W7: removing a row no longer drops keyboard focus to `<body>`, so users
keep their place in the list (WCAG 2.4.3 Focus Order). Closes issue #245.

`src/hooks/useRowRemovalFocus.ts` focuses the next row's primary control, else
the previous row, else the list heading when the list becomes empty; an
optimistic removal that rolls back returns focus to the restored row, and a
later unrelated addition never moves focus again. It is applied to
`FacilityMemberList` and `PendingInvitesList` (facility team), `ApiKeysPanel`
and `WebhooksPanel` (integrations), and the availability slot actions, each
announcing the result through `useAnnouncer` ("Invitation to … revoked", "API
key … was revoked"). The availability calendar falls back to the slot that
took the removed one's place, then to the calendar itself.

`src/hooks/useRowRemovalFocus.test.tsx` and the integrations suite assert
`document.activeElement` for the next, previous, empty and rollback cases.
