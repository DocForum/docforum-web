# docforum-web

![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)
![Status](https://img.shields.io/badge/status-pre--implementation-yellow.svg)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-61DAFB.svg)

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
| W1 | Shell & auth — signup/login per role (patient / doctor / facility) |
| W2 | Patient core flow — doctor search, booking + intake, appointments, referral accept/decline, orders + facility selection |
| W3 | Doctor core flow — today's appointments/intake, consultation screen (notes, outcome, referral/order issuance) |
| W4 | Facility core flow — fulfillment queue, mark fulfilled/rejected, attach lab results |
| W5 | Payments UI — wallet link + escrow status, calling `docforum-core`'s API only |

## Repo layout

```
src/
  pages/        Route-level components
  components/   Shared, reusable UI
  features/     Flow-specific logic — one folder per PRD core flow (booking, referral-accept, order-fulfillment selection, ...)
  hooks/        Shared React hooks
  services/     API client calls to docforum-core
  store/        Zustand client-state stores
  styles/       Design tokens / global styles
  types/        Mirrors docforum-core's data-model shapes — never invent parallel frontend-only shapes for the same entities
.github/        CI workflow, issue/PR templates
```

## Getting started

> **Honest status:** this repo is scaffolded, not runnable yet — `npm run
> dev`/`build`/`test` are placeholders. It's blocked on `docforum-core`
> having real, callable API endpoints (that repo's Phase 1/2).

```bash
git clone https://github.com/DocForum/docforum-web.git
cd docforum-web
npm install
```

What's real today: the `src/` folder structure above, a placeholder
`App.tsx`/`main.tsx`, and `index.html`. There is no dev server to run yet.

## Documentation

| Doc | Purpose |
|---|---|
| [`ARCHITECTURE_ESSENTIALS.md`](ARCHITECTURE_ESSENTIALS.md) | Frontend-only quick reference — stack, hard rules, where things live. |
| [`ROADMAP.md`](ROADMAP.md) | Phase W1–W5 breakdown and current status. |
| [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) | Rules for coding agents working in this repo — read `docforum-core`'s `PRD.md`/`AGENTS.md` first; this file only adds frontend-specific rules on top. |

## Project status

**Not started.** Blocked on `docforum-core` exposing real, callable API
endpoints. Full breakdown: [`ROADMAP.md`](ROADMAP.md).

## Contributing

Every PR that adds or changes a screen tied to a PRD core flow should note
which flow it implements in the PR description. Update `ROADMAP.md` on
every contribution that starts, completes, or blocks a tracked item — same
rule as every other repo in the `DocForum` org.

## License

[Apache License 2.0](LICENSE)
