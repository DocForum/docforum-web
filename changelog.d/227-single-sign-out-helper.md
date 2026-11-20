Phase W1: one `signOut(reason)` helper clears every piece of client state
([issue #227](https://github.com/DocForum/docforum-web/issues/227)).
Logout, idle timeout, refresh failure, account deletion, current-device
revocation, cross-tab logout and the mock dev sign-out all go through
`src/services/sign-out.ts`, which drops the auth session and CSRF cookie,
React Query cache, profile/acting-for store, unsaved-changes registry and
app-owned service-worker caches. Tests assert the query cache and profile
store are empty after each path.
