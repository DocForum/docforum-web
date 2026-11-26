import { test, expect, type Role } from './fixtures';
import { THEME_STORAGE_KEY, type ThemeName } from '../src/utils/theme';

const screens: ReadonlyArray<{ name: string; path: string; role: Role; ready: string }> = [
  { name: 'home', path: '/', role: 'patient', ready: 'DocForum' },
  { name: 'login', path: '/login', role: 'patient', ready: 'Log in' },
  { name: 'patient-dashboard', path: '/patient', role: 'patient', ready: 'What needs your attention' },
  { name: 'care-thread', path: '/care/cth-demo-1', role: 'patient', ready: 'Demo cough consult (fake)' },
  { name: 'doctor-dashboard', path: '/doctor', role: 'doctor', ready: 'Quinn Example' },
  { name: 'consultation', path: '/doctor/consultation/apt-demo-2', role: 'doctor', ready: 'Consultation note' },
  { name: 'facility-dashboard', path: '/facility', role: 'facility', ready: 'Demo Amoxicillin 500mg (fake)' },
  { name: 'admin-payments', path: '/admin/payments/console', role: 'admin', ready: 'Create payment intent' },
];

// Mock fixtures carry absolute dates, so a screenshot taken "now" drifts as
// the calendar moves: Tyke's handover invite expired on 2026-10-25T09:00Z, and
// main's baseline screenshots (PR #198) were captured after that point with the
// "Invite expired" card visible. Freezing the browser clock at that baseline
// instant keeps every screenshot deterministic. (Timers keep running — only
// `Date` is fixed.)
const FIXED_NOW = new Date('2026-10-27T12:00:00.000Z');

// The light projects capture the default theme; the extra projects pin a theme
// through the same `docforum-theme` key the app reads on boot (issue #296).
function themeFor(projectName: string): ThemeName {
  if (projectName === 'visual-dark') return 'dark';
  if (projectName === 'visual-hc') return 'high-contrast';
  return 'light';
}

for (const screen of screens) {
  test(`${screen.name} screenshot`, async ({ page, visit }, testInfo) => {
    const theme = themeFor(testInfo.project.name);
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [THEME_STORAGE_KEY, theme] as const,
    );
    await page.clock.setFixedTime(FIXED_NOW);
    await visit(screen.path, screen.role);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('#root h1, #root h2').first()).toBeVisible();
    await expect(page.getByText(screen.ready, { exact: false }).first()).toBeVisible();
    // The home screen is reached by signing out and clicking the logo, which
    // can leave the restored scroll position a few pixels off. Pin it so the
    // screenshot never depends on the previous page's scroll offset.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`${screen.name}.png`);
  });
}
