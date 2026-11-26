---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Stored user locale (issue #256)

docforum-core stores `User.locale` at signup (best match from
`Accept-Language`) and returns it on login, signup and refresh, so it is a
real field, not an assumption — `packages/api-client/openapi/docforum-core.openapi.yaml`
carries it as nullable for accounts created before core recorded one.
`useAuthStore.setSession` is the single place it is applied (every session
path funnels through it, including both refresh paths), and it goes into
`src/store/locale-store.ts` via `applyUserLocale`:

- A supported value wins over `navigator.language`, so a Spanish-speaking
  patient signing in on an English clinic machine gets Spanish.
- A regional tag (`es-MX`) resolves through `resolveLocale`; an unsupported
  one (`fr`) resolves the same way, which answers `en`.
- A locale the person picked in this session (`manualOverride`) is never
  overridden by a stored value or by a later refresh.
- Signed-out visitors keep `navigator.language`, and `signOut` resets the
  store to it so the next person on a shared device is not left in the
  previous account's language.

Persisting a switch from the UI needs a docforum-core endpoint that does not
exist yet; until then the choice lasts for the session only. Mock personas
carry no stored locale, so the behaviour is covered by
`src/store/locale-store.test.ts` rather than by a mock-mode journey.
