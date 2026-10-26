import { test, expect, type Role } from './fixtures';

const screens: ReadonlyArray<{ name: string; path: string; role: Role; ready: string }> = [
  { name: 'home', path: '/', role: 'patient', ready: 'DocForum' },
  { name: 'login', path: '/login', role: 'patient', ready: 'Log in' },
  { name: 'patient-dashboard', path: '/patient', role: 'patient', ready: 'What needs your attention' },
  { name: 'care-thread', path: '/care/cth-demo-1', role: 'patient', ready: 'Demo cough consult (fake)' },
  { name: 'doctor-dashboard', path: '/doctor', role: 'doctor', ready: 'Quinn Example' },
  { name: 'consultation', path: '/doctor/consultation/apt-demo-2', role: 'doctor', ready: 'Consultation note' },
  { name: 'facility-dashboard', path: '/facility', role: 'facility', ready: 'Demo Amoxicillin 500mg (fake)' },
  { name: 'admin-payments', path: '/admin', role: 'admin', ready: 'Create payment intent' },
];

for (const screen of screens) {
  test(`${screen.name} screenshot`, async ({ page, visit }) => {
    await visit(screen.path, screen.role);
    await expect(page.locator('#root h1, #root h2').first()).toBeVisible();
    await expect(page.getByText(screen.ready, { exact: false }).first()).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`${screen.name}.png`);
  });
}
