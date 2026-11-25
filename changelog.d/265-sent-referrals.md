Phase W3: "Referrals I've sent" for doctors, including expired and
loop-flagged referrals ([issue #265](https://github.com/DocForum/docforum-web/issues/265)).
The doctor referrals page now has Received/Sent tabs; Sent reads
`GET /referrals/created`, shows target doctor/specialty, status, age and
badges for expired-after-no-shows (referring doctor notified) and
loop-flagged referrals, newest needing attention first, and links each row
to the existing role-scoped detail. The endpoint is unpaginated, so the
whole array is sorted in one pass; snapshot notes are never rendered in the
list. The referrals page was also mounted at `/doctor/referrals` and added
to doctor navigation (it existed but had no route). Mock mode seeds one row
per status through `GET /referrals/created`. Assumed target-name expansions
are recorded in `ARCHITECTURE_ESSENTIALS.md` as a docs fragment.
