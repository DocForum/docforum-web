import { defineConfig } from '@playwright/test';

// Real backend, real database, no network mocks (issue #12). The backend is
// pinned by the CI checkout step (`.github/workflows/ci.yml`) — bump the ref
// there and update e2e/README.md's "Pinned core ref" line in the same PR.
const coreDir = process.env.DOCFORUM_CORE_DIR ?? 'docforum-core';
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://docforum:docforum@localhost:5432/docforum_e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // Core's own tsx, so its TypeScript sources and node_modules resolve
      // correctly while the process runs from this repo.
      command: `${coreDir}/backend/node_modules/.bin/tsx e2e/core-server.mts`,
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '4000',
        DATABASE_URL: databaseUrl,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'e2e-access-secret',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'e2e-refresh-secret',
        CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
        DOCFORUM_CORE_DIR: coreDir,
      },
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: 'http://localhost:4000',
      },
    },
  ],
});
