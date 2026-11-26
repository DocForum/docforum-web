Phase W1: the UI starts in the language docforum-core stored on the user
([issue #256](https://github.com/DocForum/docforum-web/issues/256)). `User`
now carries the `locale` core returns on login, signup and refresh, and
`useAuthStore.setSession` applies it to the merged locale store, so a
Spanish-speaking patient signing in on an English clinic machine gets
Spanish. A regional tag (`es-MX`) resolves through `resolveLocale`; an
unsupported one (`fr`) falls back the same way. `navigator.language` still
drives signed-out visitors, a switch made in this session is never
overridden by a stored value, and signing out puts the browser language
back for the next person on a shared device. Persisting a switch needs a
docforum-core endpoint that does not exist yet.
