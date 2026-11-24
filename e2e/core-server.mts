// Starts a real docforum-core backend for the Playwright smoke test.
//
// Deliberately imports `createApp` instead of core's `server.ts`: the latter
// also runs live Stellar/payments startup probes that a smoke test has no
// business depending on. The app (auth, CORS, cookies, Prisma) is the real
// one; the database comes from DATABASE_URL (CI: a throwaway Postgres
// service container, local: the docker command in e2e/README.md).
//
// Run with core's own tsx so `.ts` imports resolve against core's
// node_modules:  <core>/backend/node_modules/.bin/tsx e2e/core-server.mts
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const coreDir = path.resolve(process.env.DOCFORUM_CORE_DIR ?? 'docforum-core');
const appModuleUrl = pathToFileURL(path.join(coreDir, 'backend/src/app.ts')).href;

const { createApp } = (await import(appModuleUrl)) as {
  createApp: () => { listen: (port: number, cb: () => void) => unknown };
};

const port = Number(process.env.PORT ?? 4000);
createApp().listen(port, () => {
  console.log(`[e2e] docforum-core listening on :${port}`);
});
