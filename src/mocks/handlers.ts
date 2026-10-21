// All mock handlers, composed. Order matters only where paths could
// overlap — specific (`/patients/me/…`) before generic (`/patients/:id/…`).
import { accountHandlers } from './handlers/account';
import { authHandlers } from './handlers/auth';
import { careThreadHandlers } from './handlers/care-thread';
import { consultationHandlers } from './handlers/consultation';
import { disputesHandlers } from './handlers/disputes';
import { dependentHandlers } from './handlers/dependents';
import { doctorTodayHandlers } from './handlers/doctor-today';
import { facilityTeamHandlers } from './handlers/facility-team';
import { facilityHandlers } from './handlers/facility';
import { healthProfileHandlers } from './handlers/health-profile';
import { insightsHandlers } from './handlers/insights';
import { messagingHandlers } from './handlers/messaging';
import { orderHandlers } from './handlers/orders';
import { paymentsHandlers } from './handlers/payments';
import { queueHandlers } from './handlers/queue';
import { adminClosuresHandlers } from './handlers/admin-closures';

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...dependentHandlers,
  ...healthProfileHandlers,
  ...careThreadHandlers,
  ...consultationHandlers,
  ...doctorTodayHandlers,
  ...queueHandlers,
  ...messagingHandlers,
  ...insightsHandlers,
  ...facilityHandlers,
  ...facilityTeamHandlers,
  ...orderHandlers,
  ...paymentsHandlers,
  ...adminClosuresHandlers,
  ...disputesHandlers,
];
