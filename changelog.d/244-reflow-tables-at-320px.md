Phase W7: DataTable and the admin/facility record tables now reflow at 320 CSS px
([issue #244](https://github.com/DocForum/docforum-web/issues/244)). Below the
breakpoint each row becomes a labelled card, the column headers are shown as
cell labels, and sorting stays available through a dedicated control group.
Applied to audit events, PHI access logs and the facility payout ledger, with
Playwright checks that these screens have no horizontal page scroll at 320px.
Analytics data grids intentionally keep their two-dimensional scrolling.
