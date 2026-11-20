Phase W7: every routed patient and facility screen is in that role's
navigation ([issue #231](https://github.com/DocForum/docforum-web/issues/231)).
Patients gain My orders and Payments entries, facility users gain Insights
and Settings, and secondary entries (payments, settings) sit after a divider
so the desktop bar stays on one line; the mobile drawer reuses the same flat
list. Layout tests now assert each role's expected nav entries so a new route
without a nav entry is a deliberate choice.
