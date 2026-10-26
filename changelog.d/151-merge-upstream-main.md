PR #151: merged the latest `upstream/main` into the W7 platform-quality
branch and resolved the resulting conflicts without dropping either side.
Kept the W7 locale-aware formatting, offline/retry behaviour and
accessibility fixes (headings, table captions, live regions, focus
handling, dialog focus management, contrast tokens) while adopting
upstream's time-zone display, record search, notification preferences,
feature flags, SSE cache sync and mock-API coverage. Tests now run against
the shared MSW handlers, including hanging handlers for the api-client
timeout tests, so no test can fall through to a real backend.
