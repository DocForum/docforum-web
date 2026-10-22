import { describe, expect, it } from 'vitest';
import type { PatientOrder, Prescription } from '../../types/models';
import { currentOrderVersions } from './current-orders';

function prescription(overrides: Partial<Prescription> & Pick<Prescription, 'id' | 'version'>): Prescription {
  return {
    patientProfileId: 'pat-1',
    orderType: 'prescription',
    supersedesId: null,
    status: 'active',
    issuedAt: '2026-10-01T09:00:00Z',
    requiresFacilitySelection: true,
    selectedFacility: null,
    medication: 'Demo medicine',
    dose: 'One tablet',
    ...overrides,
  };
}

describe('currentOrderVersions', () => {
  it('shows the newest version of a supersedes chain regardless of input order', () => {
    const v2 = prescription({
      id: 'rx-v2',
      version: 2,
      supersedesId: 'rx-v1',
      issuedAt: '2026-10-03T09:00:00Z',
      medication: 'Corrected medicine',
    });
    const v1 = prescription({
      id: 'rx-v1',
      version: 1,
      issuedAt: '2026-10-01T09:00:00Z',
      medication: 'Original medicine',
    });

    const [entry] = currentOrderVersions([v2, v1]);

    expect(entry.order.id).toBe('rx-v2');
    expect(entry.history.map((order) => order.id)).toEqual(['rx-v1']);
  });

  it('walks longer chains and keeps separate orders apart', () => {
    const v3 = prescription({ id: 'rx-v3', version: 3, supersedesId: 'rx-v2' });
    const v2 = prescription({ id: 'rx-v2', version: 2, supersedesId: 'rx-v1' });
    const v1 = prescription({ id: 'rx-v1', version: 1 });
    const lab: PatientOrder = {
      id: 'lab-1',
      patientProfileId: 'pat-1',
      orderType: 'lab_order',
      version: 1,
      supersedesId: null,
      status: 'active',
      issuedAt: '2026-10-05T09:00:00Z',
      requiresFacilitySelection: true,
      selectedFacility: null,
      testName: 'Demo blood panel',
    };

    const entries = currentOrderVersions([v2, lab, v1, v3]);

    expect(entries.map((entry) => entry.order.id)).toEqual(['lab-1', 'rx-v3']);
    expect(entries[1].history.map((order) => order.version)).toEqual([1, 2]);
  });
});
