Fix e2e CI failures after W7 platform quality integration

- Move `UpdatePromptContainer` inside `I18nProvider` (App.tsx) to resolve React Intl crash that blanked the app.
- Wrap Delete Account policy lists in `<li>` elements to satisfy axe `list` rule on `/patient/settings`.
- Update journey test to expect the new localized recoverable error message (`Something went wrong…`) instead of the raw mock message.
- Add responsive mobile header wrapping (≤639px) so LanguageSwitcher, ProfileSwitcher, RecordSearch, and Log out no longer overflow horizontally.
- Regenerate all visual snapshots (desktop + mobile) to reflect W7 UI changes (language selector, updated dashboard content, mobile header layout).

All 79 Playwright tests (journeys, a11y-light, a11y-reduced, visual-desktop, visual-mobile) now pass. Unit tests, typecheck, and i18n check also pass.