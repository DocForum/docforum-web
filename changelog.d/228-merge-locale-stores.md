Phase W7: locale stores merged ([issue #228](https://github.com/DocForum/docforum-web/issues/228)).
The patient locale (en/es) and formatting locale (en-US, en-GB, de-DE, ar-EG)
now share one store; `dir` is computed from the language subtag and
`document.lang`/`dir` are synced by `I18nProvider`. `LanguageSwitcher` and
`LocaleSync` use the new API.
