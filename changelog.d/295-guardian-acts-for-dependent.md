Phase W2: browser journey for acting-for across the patient screens
([issue #295](https://github.com/DocForum/docforum-web/issues/295)). The mock
API now scopes care threads, orders and health entries to the selected acting
profile, with dependent-only fixtures, and `useMyOrders` sends the acting
profile id so a switch cannot show one person's orders under another's name.
The journey switches to the dependent, checks the banner and each screen,
asserts the profile id on the requests, and switches back to prove no stale
data remains.
