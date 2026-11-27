Phase W1: show-password toggle and Caps Lock hint on every password field
([issue #243](https://github.com/DocForum/docforum-web/issues/243)).
`PasswordField`/`PasswordInput` add an `aria-pressed` toggle and a polite Caps
Lock hint to login, signup, password reset, invite acceptance, dependent
account claim and account deletion, and re-mask the field on submit.
