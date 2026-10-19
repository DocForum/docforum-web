// Mutable in-memory "database" backing the mock API. Handlers mutate this
// directly (start a visit, add a dependent, fund an intent) so state
// persists across requests for the lifetime of the dev server — and resets
// on `Reset fixture data` in the dev panel or on reload. Never imported by
// application code; only by src/mocks/**.
import { createSeedDb, type MockDb } from './fixtures';

export let db: MockDb = createSeedDb();

export function resetDb(): void {
  db = createSeedDb();
}
