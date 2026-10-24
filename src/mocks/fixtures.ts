// Minimal seed fixtures for the mock API (issue #95). Only includes
// types that exist on main. Everything here is DELIBERATELY FAKE.
import type {
  Appointment,
  DataExport,
  Dependent,
  FacilityWithDistance,
  HealthEntry,
  User,
} from '../types/models';

// --- Personas (one per role the dev panel can switch to) --------------------

export const MOCK_ACCESS_TOKEN = 'mock-access-token';

export const PATIENT_USER: User = {
  id: 'usr-patient-demo',
  email: 'pat.placeholder@example.test',
  role: 'patient',
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-05T09:00:00.000Z',
};

export const DOCTOR_USER: User = {
  id: 'usr-doctor-demo',
  email: 'doc.placeholder@example.test',
  role: 'doctor',
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-05T09:00:00.000Z',
};

export const FACILITY_USER: User = {
  id: 'usr-facility-demo',
  email: 'fac.placeholder@example.test',
  role: 'facility',
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-05T09:00:00.000Z',
};

export const ADMIN_USER: User = {
  id: 'usr-admin-demo',
  email: 'admin.placeholder@example.test',
  role: 'admin',
  createdAt: '2026-01-05T09:00:00.000Z',
  updatedAt: '2026-01-05T09:00:00.000Z',
};

// --- Seed data for each feature ---------------------------------------------

export const APPOINTMENTS: Appointment[] = [];

export const DEPENDENTS: Dependent[] = [];

export const HEALTH_ENTRIES: HealthEntry[] = [];

export const DATA_EXPORTS: DataExport[] = [];

export const FACILITIES_WITH_DISTANCE: FacilityWithDistance[] = [];

// --- IDs used by handlers ---------------------------------------------------

export const PATIENT_PROFILE_ID = 'prof-patient-demo';
export const DEPENDENT_PROFILE_ID = 'prof-dependent-demo';

// --- Database interface -----------------------------------------------------

export interface MockDb {
  appointments: Appointment[];
  dependents: Dependent[];
  healthEntries: HealthEntry[];
  dataExports: DataExport[];
  dataExport: DataExport | null;
  facilities: FacilityWithDistance[];
}

export function createSeedDb(): MockDb {
  return {
    appointments: APPOINTMENTS,
    dependents: DEPENDENTS,
    healthEntries: HEALTH_ENTRIES,
    dataExports: DATA_EXPORTS,
    dataExport: null,
    facilities: FACILITIES_WITH_DISTANCE,
  };
}
