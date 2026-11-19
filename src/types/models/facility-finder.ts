import type { FacilityProfile } from './session-idle-timeout';

// --- Facility finder with location & distance (Phase W2, issue #29) ----------

export interface FacilityLocation {
  address: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface FacilityWithDistance extends FacilityProfile {
  location?: FacilityLocation;
  distanceKm?: number | null;
  isOpen?: boolean;
  phone?: string;
  rating?: number;
}
