---
file: ROADMAP.md
section: Phase W7 — Platform quality: reliability, accessibility, performance, testing
---
### Footer link reliability (issue #221)

Footer links previously used raw `<a href="/privacy">` which navigated outside the SPA under GitHub Pages `/docforum-web/` base path, causing a 404 and dropping the in-memory session. Both the Privacy & analytics and Admin closures "Back" links have been changed to `<Link to="...">` from `react-router-dom`, using the shared `styles.navLink` class. This ensures all in-app footer navigation stays within the router, preserves the active session, and avoids full page reloads. Labels are translated via the `useT` hook where applicable.