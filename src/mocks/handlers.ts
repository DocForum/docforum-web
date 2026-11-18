// All mock handlers, composed. Order matters only where paths could
// overlap — specific (`/patients/me/…`) before generic (`/patients/:id/…`).
import { accountHandlers } from './handlers/account';
import { adminVerificationHandlers } from './handlers/admin-verification';
import { authHandlers } from './handlers/auth';
import { careThreadHandlers } from './handlers/care-thread';
import { consultationHandlers } from './handlers/consultation';
import { disputesHandlers } from './handlers/disputes';
import { dependentHandlers } from './handlers/dependents';
import { doctorTodayHandlers } from './handlers/doctor-today';
import { facilityTeamHandlers } from './handlers/facility-team';
import { featureFlagHandlers } from './handlers/feature-flags';
import { eventHandlers } from './handlers/events';
import { facilityHandlers } from './handlers/facility';
import { facilitySettingsHandlers } from './handlers/facility-settings';
import { healthProfileHandlers } from './handlers/health-profile';
import { insightsHandlers } from './handlers/insights';
import { integrationsHandlers } from './handlers/integrations';
import { messagingHandlers } from './handlers/messaging';
import { notificationHandlers } from './handlers/notifications';
import { orderHandlers } from './handlers/orders';
import { paymentsHandlers } from './handlers/payments';
import { queueHandlers } from './handlers/queue';
import { searchHandlers } from './handlers/search';
import { adminClosuresHandlers } from './handlers/admin-closures';
import { verificationHandlers } from './handlers/verifications';

export const handlers = [
  ...authHandlers,
  ...accountHandlers,
  ...adminVerificationHandlers,
  ...dependentHandlers,
  ...healthProfileHandlers,
  ...careThreadHandlers,
  ...consultationHandlers,
  ...doctorTodayHandlers,
  ...queueHandlers,
  ...messagingHandlers,
  ...notificationHandlers,
  ...insightsHandlers,
  ...orderHandlers,
  ...facilityHandlers,
  ...facilitySettingsHandlers,
  ...facilityTeamHandlers,
  ...featureFlagHandlers,
  ...eventHandlers,
  ...integrationsHandlers,
  ...orderHandlers,
  ...paymentsHandlers,
  ...searchHandlers,
  ...adminClosuresHandlers,
  ...disputesHandlers,
  ...verificationHandlers,
];
