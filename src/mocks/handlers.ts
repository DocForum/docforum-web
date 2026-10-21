// All mock handlers, composed. Order matters only where paths could
// overlap — specific (`/patients/me/…`) before generic (`/patients/:id/…`).
import { accountHandlers } from './handlers/account';
import { adminVerificationHandlers } from './handlers/admin-verification';
import { authHandlers } from './handlers/auth';
import { careThreadHandlers } from './handlers/care-thread';
import { consultationHandlers } from './handlers/consultation';
import { dependentHandlers } from './handlers/dependents';
import { facilityTeamHandlers } from './handlers/facility-team';
import { facilityHandlers } from './handlers/facility';
import { healthProfileHandlers } from './handlers/health-profile';
import { insightsHandlers } from './handlers/insights';
import { messagingHandlers } from './handlers/messaging';
import { paymentsHandlers } from './handlers/payments';
import { queueHandlers } from './handlers/queue';

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...adminVerificationHandlers,
  ...dependentHandlers,
  ...healthProfileHandlers,
  ...careThreadHandlers,
  ...consultationHandlers,
  ...queueHandlers,
  ...messagingHandlers,
  ...insightsHandlers,
  ...facilityHandlers,
  ...facilityTeamHandlers,
  ...paymentsHandlers,
];
