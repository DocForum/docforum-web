Phase W6: per-specialty verification review for admins
([issue #65](https://github.com/DocForum/docforum-web/issues/65), PRD
§8.1.5). A new specialty claims queue at `/admin/verification` — the
per-doctor verification queue (#64) decides a doctor account, this one
decides each claimed doctor↔specialty pair, so a GP can't quietly list
cardiology and receive cardiology referrals. Claims are grouped by doctor
with the supporting credential beside each claim (opened via blob URL so
the bearer token never lands in a link href, and a missing document is
flagged as a judgement call); approve/reject per claim in one dialog,
with a rejection requiring a doctor-facing reason saying what to fix or
resubmit and an approval taking an optional audit note. No bulk actions,
per the issue. Specialty and claim-age filters are server-side and
synced to the URL; `expectedUpdatedAt` turns concurrent reviews into
conflicts. New service functions live alongside #64's in
`admin-verification-service.ts`; mock handlers serve the queue, filters,
decisions (a bare rejection is a `422`) and credential bytes. **Built
against assumed shapes:** docforum-core#51 hasn't landed; see
`ARCHITECTURE_ESSENTIALS.md` "Known assumptions — Phase W6".
