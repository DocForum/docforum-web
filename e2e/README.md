# End-to-end smoke test (issue #12)

One Playwright test that drives the real app against a **real
`docforum-core` backend and a throwaway Postgres** — no MSW, no service
stubs. It covers: sign up → open a protected page → reload stays signed in
(#9) → log out → reload stays logged out → log back in.

## Pinned core ref

CI checks out `docforum-core` at the SHA in
`.github/workflows/ci.yml` (`E2E_CORE_REF`). To bump it, change that value
and this line in the same PR. The pin exists so a backend change can't break
this repo's CI without a deliberate update.

## Run locally

```bash
# 1. Throwaway Postgres on the default port.
docker run --rm -d --name docforum-e2e-pg \
  -e POSTGRES_USER=docforum -e POSTGRES_PASSWORD=docforum \
  -e POSTGRES_DB=docforum_e2e -p 5432:5432 postgres:16

# 2. Sibling checkout of docforum-core (any ref; CI pins its own).
git clone https://github.com/DocForum/docforum-core.git

# 3. Install + migrate core's backend.
(cd docforum-core/backend && npm ci && npm run prisma:generate)
(cd docforum-core/backend && DATABASE_URL=postgresql://docforum:docforum@localhost:5432/docforum_e2e \
  npx prisma migrate deploy)

# 4. Run the smoke test. It starts the backend (port 4000) and Vite (5173).
npm run test:e2e
```

If your core checkout is not at `./docforum-core`, set
`DOCFORUM_CORE_DIR=/path/to/docforum-core`. `DATABASE_URL` overrides the
default `postgresql://docforum:docforum@localhost:5432/docforum_e2e`.

Playwright itself needs browsers once: `npx playwright install chromium`.
