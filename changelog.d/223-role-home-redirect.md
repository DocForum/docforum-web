Phase W1: every role now lands on its own dashboard after signing in or
visiting `/` ([issue #223](https://github.com/DocForum/docforum-web/issues/223)).
Admins were missing from the landing page's redirect map, and `LoginPage`
always sent people to `/`. The role → home mapping now lives in one helper
(`src/navigation/role-home.ts`) used by `HomePage`, `LoginPage`, the invite
acceptance flow, the mock role switcher and the notifications fallback.
Unknown roles fall back to the public home page instead of crashing, and the
invite flow now routes admins and facility staff through the same source of
truth.
