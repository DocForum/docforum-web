Phase W7: synchronize logout and acting-for profile changes across tabs
([issue #124](https://github.com/DocForum/docforum-web/issues/124)).
A `BroadcastChannel` carries logout and profile-change signals only — never
access tokens or user data. Logging out in one tab clears the session and
React Query cache in the others; switching the acting-for profile follows in
every tab. Browsers without `BroadcastChannel` keep normal single-tab
behaviour. Refresh single-flight remains blocked on issue #9's
refresh-on-reload flow.
