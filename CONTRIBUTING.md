# Contributing to docforum-web

This is the frontend of a 3-repo org (`docforum-core`, `docforum-web`,
`docforum-escrow`). This guide is for humans picking up a scoped issue —
if you're an AI coding agent, read `AGENTS.md` instead (and, one level
up, `docforum-core`'s `AGENTS.md`/`PRD.md`/`ARCHITECTURE.md` for the
product context this repo builds on).

## 1. Set up locally

```bash
git clone https://github.com/DocForum/docforum-web.git
cd docforum-web
npm install
npm run dev        # → http://localhost:5173
```

No backend required to start the dev server, but most screens need one
to actually do anything: run `docforum-core`'s backend yourself (see its
`CONTRIBUTING.md`), or point `VITE_API_BASE_URL` at a hosted instance.
`npm run dev` defaults to `http://localhost:4000`.

### Run with no backend at all: the mock API

`npm run dev:mock` starts the same Vite dev server with an
[MSW](https://mswjs.io)-backed mock of every endpoint the app calls —
no `docforum-core` needed:

- **Role switcher** — jump straight into the patient, doctor, facility or
  admin experience (seeded personas with obviously fake data, all
  `@example.test` emails). Logging in through the real login screen works
  too; any email logs you in as the selected role.
- **Scenarios** — toggle empty datasets and forced 500s to see empty and
  error states without hand-crafting backend conditions.
- **Latency** — delay every response (0–3 s) to check loading states.
- **Reset data** — restore the fixture database after in-session
  mutations (nothing is persisted; fixtures reset on reload).

Mock handlers live in `src/mocks/` and sit on top of the fixtures in
`src/mocks/fixtures.ts`. The app still reaches them through the normal
service layer (`src/services/`), so screens behave exactly as they do
against the real API. Mock code is excluded from production builds, and
CI fails if it ever leaks (`npm run check:dist`).

**When you add a service call to a new endpoint**, add a handler and
fixtures in `src/mocks/` in the same PR, and cover it in
`src/mocks/handlers.test.ts` — that's what keeps `dev:mock` honest as the
API grows.

## 2. Find something to work on

Open issues are scoped, real, and tagged with a complexity/point value
(Trivial/100, Medium/150, High/200) in the issue body — see the
[issue list](https://github.com/DocForum/docforum-web/issues). Several
current issues are explicitly built against a **documented assumed API
contract**, because the `docforum-core` endpoint they'll eventually call
doesn't exist yet — this is stated plainly in the issue, not hidden.
Comment on an issue to claim it before starting, and check it's still
open.

`ROADMAP.md` shows the bigger picture: which phase (W1-W5) an issue
belongs to, what depends on what, and what's deliberately not yet
scoped (and why).

## 3. Before you open a PR

- Use the `frontend-design` skill's guidance (or just its principles, if
  you're not using Claude Code) for any new UI — see this repo's
  `AGENTS.md`. Avoid generic-AI-design tells: gradient-highlighted
  headline words, ALL-CAPS eyebrows, decorative monospace, a card grid
  for content that's actually a sequence.
- If your issue is built against an assumed API contract, document the
  exact assumed shape in `ARCHITECTURE_ESSENTIALS.md` "Known
  assumptions" as part of your PR — that's how the next person (or the
  `docforum-core` contributor eventually building the real endpoint)
  knows what to match or revise.
- If your change starts, completes, or blocks a roadmap-tracked item,
  tick or update that item's line in `ROADMAP.md` and add a changelog
  entry as a new file in `changelog.d/`, in the same PR. Don't append to
  the end of `ROADMAP.md`; that is what made every PR conflict. See
  `changelog.d/README.md`.
- Keep doc edits to your own lines: add rows and lines, don't rewrite
  other people's paragraphs. See `AGENTS.md` → "Shared docs".
- Run `npm run typecheck && npm run test && npm run build` locally —
  this is exactly what CI checks.

## 4. Opening the PR

- Branch off `main`.
- Reference the issue you're closing (`Closes #N`).
- State what changed, why, and which `ROADMAP.md` item it maps to.
- CI (typecheck, tests, build) must pass before merge — it runs
  automatically on your PR.

## 5. Preview builds for every pull request

Every PR gets a preview **artifact**, built in **mock-API mode**, so reviewers
can walk through a change without checking it out:

- `pr-preview-build.yml` builds the PR on `pull_request` (read-only token, no
  secrets), runs the tests, checks that the bundle is mock-only, and uploads
  `dist/` as a downloadable artifact.
- `pr-preview-comment.yml` runs on `workflow_run` and comments a link to the
  artifact. It resolves the PR from the build run itself, so it also works for
  fork PRs (GitHub leaves `workflow_run.pull_requests` empty for those).
- The artifact is **never published** to GitHub Pages or any other shared
  origin. A PR controls its own build, so serving it from `docforum.github.io`
  would put contributor JavaScript on the real app's origin. Artifacts are
  private to the repository and expire after 14 days.
- Download the artifact, unzip it, and serve the folder locally, for example
  `npx serve <folder>`.

The preview runs against the MSW mock API only (`npm run dev:mock`'s handlers
and fixtures), seeded with obviously fake `@example.test` data. It is built
with a reserved-invalid API URL, so it cannot reach the real backend even if a
request escapes the mocks. `npm run check:preview` fails the build if either
guarantee is missing; since the PR controls that script, treat it as a quality
gate rather than a security boundary — the security property is that the build
is never served from a shared origin.

Fork code therefore never runs in a job that holds a write token or a secret,
and the privileged comment job never checks out or executes anything the PR
produced. Keep it that way: if a preview needs a secret, it belongs in the
build job's *public* config, never a token.

`npm run dev:mock` is still the fastest way to review locally; preview builds
are for "there is a runnable bundle attached to the PR".

## 6. Shared test utilities and the coverage gate

- `src/test/render.tsx` — `renderWithProviders(ui, { route, role, session })`
gives a component the providers the app actually uses (fresh React Query
client, router, optional signed-in role). `render` remains the plain entry
point.
- `src/test/factories.ts` — typed factories for every model
(`makePrescriptionOrder`, `makeNotification`, …). State only the fields the
test asserts on; do not hand-write model objects.
- `src/test/server.ts` — one MSW server for the run. Tests that exercise the
real `src/services/` layer hit the same handlers as `npm run dev:mock`.
- `npm run test:coverage` enforces thresholds on `src/features/` and
`src/services/` (configured in `vite.config.ts`) and runs in CI. Thresholds
are a floor at the level measured when they were set: raise them when you add
coverage, never lower them to make a PR pass.

## 7. Loading, empty and error states

New screens use the shared components from `src/components/states/` instead
of inventing local spinners and error paragraphs:

- `Skeleton` — loading placeholder; animation stops under
  `prefers-reduced-motion`.
- `EmptyState` — an empty screen always offers the next action (the prop is
  required).
- `InlineError` — a failed section inside an otherwise working screen, with
  an optional retry.
- `PageError` — a route whose primary query failed, with retry and a way out.
- `QueryState` — picks skeleton / error / empty / content from a React Query
  result, so a screen never reimplements that decision.

## Found a bug instead?

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md), not
a comment on an unrelated issue — keeps scope and Wave points honest.
