Phase W4: API keys and webhooks management for facility system integrations
([issue #55](https://github.com/DocForum/docforum-web/issues/55)).

Added `/facility/integrations` with an API key list (prefix, created, last
used), create with a one-time secret (copy + warning, dropped from the
mutation cache and DOM when the dialog closes), and revoke with
confirmation. Webhook endpoints list URL and event subscriptions, create
with a one-time HMAC signing secret, send a test delivery, and show recent
deliveries with status and redelivery. Owner-only access notice, integration
docs link, and the facility tab nav/header nav updated. New
`src/features/integrations/` (components, hooks, CSS module),
`src/services/integrations-service.ts`, types in `models.ts`, MSW
handlers/fixtures and handler tests. API shapes are assumed pending
`docforum-core`#125/#126, recorded in `ARCHITECTURE_ESSENTIALS.md` "Known
assumptions — Phase W4".
