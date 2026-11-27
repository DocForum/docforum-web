// Build-time gate for demo mode (issue #127). The demo is compiled in only
// when the build sets VITE_DEMO_MODE=true (a dedicated demo/preview build).
// Everywhere else this constant is statically false, so the `?demo=1` branch
// in main.tsx and the "Try the demo" link are dead code: MSW, the fixtures
// and the handlers are never emitted, and `npm run check:dist` still scans
// every built file with no exemptions.
export const demoModeEnabled = import.meta.env.VITE_DEMO_MODE === 'true';
