---
file: ARCHITECTURE_ESSENTIALS.md
section: Known assumptions
---
### Backend liveness probe and reachability

- `GET /health/live` → HTTP 200 `{"status":"ok"}`. Public, unauthenticated liveness
  probe fired once at boot (non-blocking) and on user retry to warm cold-started
  Render instances and detect reachability failures separately from browser offline state.

