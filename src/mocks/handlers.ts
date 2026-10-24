// All mock handlers, composed. Order matters only where paths could
// overlap — specific (`/patients/me/…`) before generic (`/patients/:id/…`).
import { accountHandlers } from './handlers/account';
import { authHandlers } from './handlers/auth';
import { dependentHandlers } from './handlers/dependents';
import { facilityHandlers } from './handlers/facility';
import { healthProfileHandlers } from './handlers/health-profile';
import { queueHandlers } from './handlers/queue';

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...dependentHandlers,
  ...healthProfileHandlers,
  ...queueHandlers,
  ...facilityHandlers,
];
