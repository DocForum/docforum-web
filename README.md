# docforum-web

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![Status](https://img.shields.io/badge/status-Phase%20W1-yellow.svg)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-61DAFB.svg)

**🔗 [Live UI preview](https://docforum.github.io/docforum-web/)** — deployed
from `main` on every push, connected to a real backend (`docforum-core`
running on Render). Signup/login work end-to-end. **Still a preview, not
production:** the free-tier backend cold-starts after 15 minutes idle
(~1 minute delay on the first request) and its database expires
2026-10-14 unless renewed — see [Getting started](#getting-started).

**Frontend for DocForum** — the patient/doctor/facility web client for the
booking → referral → prescription/lab-order → fulfillment flow described in
[`docforum-core`'s `PRD.md`](https://github.com/DocForum/docforum-core/blob/main/PRD.md).

This repo owns presentation only. It talks exclusively to
[`docforum-core`](https://github.com/DocForum/docforum-core)'s API — it
never calls [`docforum-escrow`](https://github.com/DocForum/docforum-escrow)
or any Stellar SDK directly. If a screen needs payment/escrow data, that's
a `docforum-core` API gap to file, not a reason to add a Stellar dependency
here (see [`ARCHITECTURE_ESSENTIALS.md` hard rule 1](ARCHITECTURE_ESSENTIALS.md#hard-rules)).

> **Full product context lives in `docforum-core`.** Read that repo's
> `PRD.md` and `ARCHITECTURE_ESSENTIALS.md` before starting frontend work
> here — this repo's own `ARCHITECTURE_ESSENTIALS.md` covers only
> frontend-specific rules.

## Table of contents

- [Tech stack](#tech-stack)
- [Core flows](#core-flows)
- [Repo layout](#repo-layout)
- [Getting started](#getting-started)
- [Documentation](#documentation)
- [Project status](#project-status)
- [Contributing](#contributing)
- [License](#license)

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React + TypeScript |
| Build tool | Vite |
| Server state | React Query — always refetch/cache against `docforum-core`'s API, never hand-roll persistence for server-derived data |
| Client state | Zustand — client-only UI state |

## Core flows

Mirrors the phase breakdown in [`ROADMAP.md`](ROADMAP.md), each carved out
of `docforum-core`'s original (pre-split) Phase 7:

| Phase | Flow |
|---|---|
| W1 ✅ | Shell & auth — signup (patient/doctor self-serve; facility is admin-invited, PRD OQ-2) + login for all three roles |
| W2 | Patient core flow — doctor search, booking + intake, appointments, referral accept/decline, orders + facility selection |
| W3 | Doctor core flow — today's appointments/intake, consultation screen (notes, outcome, referral/order issuance) |
| W4 | Facility core flow — fulfillment queue, mark fulfilled/rejected, attach lab results |
| W5 | Payments UI — wallet link + escrow status, calling `docforum-core`'s API only |

## Repo layout

```
src/
  pages/            Route-level components (Home, Login, Signup, role dashboards, 404)
  components/       Shared, reusable UI (Button, TextField, FormError, Layout, RequireAuth route guard)
  features/
    auth/           Phase W1 — LoginForm/SignupForm/RoleSelect, useLogin/useSignup/useLogout, validation
  hooks/            Shared React hooks (none yet — empty until a cross-feature hook exists)
  services/         API client calls to docforum-core (api-client.ts, auth-service.ts)
  store/            Zustand client-state stores (auth-store.ts — in-memory only, never persisted)
  styles/           Design tokens / global styles (light + dark via prefers-color-scheme)
  types/            Mirrors docforum-core's data-model shapes — never invent parallel frontend-only shapes for the same entities
  test/             Shared test setup + a custom render() wrapping providers
.github/            CI workflow, issue/PR templates
```

## Getting started

```bash
git clone https://github.com/DocForum/docforum-web.git
cd docforum-web
npm install
npm run dev        # → http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck (`tsc -b`) + production build to `dist/` |
| `npm test` | Runs the vitest suite (14 tests today) |
| `npm run typecheck` | `tsc -b --noEmit` only |

All four are real and verified working — the app shell, routing, and
Phase W1 auth screens render and build cleanly.

**Talking to a backend:** [`docforum-core`](https://github.com/DocForum/docforum-core)'s
Phase 1 API is real now, confirmed against this repo's original W1
assumptions — see [`ARCHITECTURE_ESSENTIALS.md` "Known gaps against the
real API"](ARCHITECTURE_ESSENTIALS.md#known-gaps-against-the-real-api-docforum-core-phase-1-landed-2026-09-14).
`npm run dev` locally defaults to `http://localhost:4000` (see
`.env.example` — run `docforum-core`'s backend yourself to use this); the
deployed Pages preview points at a hosted instance instead (set via
`VITE_API_BASE_URL` in `.github/workflows/deploy-pages.yml`, not baked
into the repo's own `.env.example`).

## Documentation

| Doc | Purpose |
|---|---|
| [`ARCHITECTURE_ESSENTIALS.md`](ARCHITECTURE_ESSENTIALS.md) | Frontend-only quick reference — stack, hard rules, where things live. |
| [`ROADMAP.md`](ROADMAP.md) | Phase W1–W5 breakdown and current status. |
| [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) | Rules for coding agents working in this repo — read `docforum-core`'s `PRD.md`/`AGENTS.md` first; this file only adds frontend-specific rules on top. |

## Project status

**Phase W1 (shell & auth) built and verified** — dev server, build, and
test suite all work; UI and client-side auth flow are real. **Phases
W2–W5 (patient/doctor/facility core flows, payments UI) are not started**
and are blocked on `docforum-core` exposing real, callable API endpoints
(its Phase 1/2). Full breakdown: [`ROADMAP.md`](ROADMAP.md).

## Contributing

Every PR that adds or changes a screen tied to a PRD core flow should note
which flow it implements in the PR description. Update `ROADMAP.md` on
every contribution that starts, completes, or blocks a tracked item — same
rule as every other repo in the `DocForum` org.

## License

[Apache License 2.0](LICENSE)
