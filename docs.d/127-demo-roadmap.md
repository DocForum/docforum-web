---
file: ROADMAP.md
section: Changelog
---
- 2026-11-23 — Phase W7 demo mode (#127) built. `?demo=1` lazy-loads
  `src/demo/` (MSW worker, seeded fixtures, role picker, and a "Demo — no real
  data" banner) and blocks unmocked real API requests. Demo-only fixture
  handlers cover all four roles; production mock-code checks exempt only the
  dedicated lazy demo chunk.
