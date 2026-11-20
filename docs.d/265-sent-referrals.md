---
file: ROADMAP.md
section: Phase W3 — Doctor core flow
---
- [x] "Referrals I've sent" for doctors, including expired and loop-flagged
  ones. Tracked as [issue #265](https://github.com/DocForum/docforum-web/issues/265):
  `src/features/referrals/`, `DoctorReferralsPage` at `/doctor/referrals`
  (Received/Sent tabs). Reads `GET /referrals/created`, shows target
  doctor/specialty, status, age, expired-after-no-shows and loop-flagged
  badges, newest needing attention first, and links to the existing referral
  detail. Assumed target-name expansions are recorded in
  `ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W3".
