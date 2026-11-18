import { describe, expect, it } from 'vitest';
import {
  draftToSettingsInput,
  emptyOpeningHours,
  formatAmountFromStroops,
  hasFacilitySettingsErrors,
  parseAssetAmount,
  parseEffectiveFrom,
  settingsToDraft,
  validateFacilitySettings,
} from './validation';
import type { FacilitySettings } from '../../types/models';

const settings: FacilitySettings = {
  facilityId: 'fac-test',
  name: 'Test Pharmacy (fake)',
  type: 'pharmacy',
  address: '1 Test Street',
  city: 'Testville',
  latitude: 6.5,
  longitude: 3.4,
  phone: '+000 000 0000',
  email: 'test@example.test',
  openingHours: emptyOpeningHours(),
  updatedAt: '2026-10-18T09:00:00.000Z',
};

describe('facility settings validation', () => {
  it('converts settings to an editable draft and back', () => {
    const draft = settingsToDraft(settings);
    expect(draft.latitude).toBe('6.5');
    expect(draft.email).toBe('test@example.test');

    const input = draftToSettingsInput(draft);
    expect(input).toMatchObject({
      address: '1 Test Street',
      city: 'Testville',
      latitude: 6.5,
      longitude: 3.4,
      phone: '+000 000 0000',
      email: 'test@example.test',
    });
    expect(input.openingHours).toHaveLength(7);
  });

  it('requires address, city, phone and valid coordinates', () => {
    const draft = {
      ...settingsToDraft(settings),
      address: '  ',
      city: '',
      phone: '',
      latitude: '91',
      longitude: '-181',
      email: 'not-an-email',
    };
    const errors = validateFacilitySettings(draft);

    expect(errors.address).toMatch(/required/i);
    expect(errors.city).toMatch(/required/i);
    expect(errors.phone).toMatch(/required/i);
    expect(errors.latitude).toMatch(/between -90 and 90/i);
    expect(errors.longitude).toMatch(/between -180 and 180/i);
    expect(errors.email).toMatch(/valid contact email/i);
    expect(hasFacilitySettingsErrors(errors)).toBe(true);
  });

  it('requires an opening and closing time and enforces ordering', () => {
    const draft = settingsToDraft(settings);
    draft.openingHours = draft.openingHours.map((entry) =>
      entry.day === 'monday'
        ? { ...entry, closed: false, opensAt: '18:00', closesAt: '09:00' }
        : entry,
    );
    const errors = validateFacilitySettings(draft);
    expect(errors.openingHours.monday?.closesAt).toMatch(/after opening time/i);

    draft.openingHours = draft.openingHours.map((entry) =>
      entry.day === 'tuesday'
        ? { ...entry, closed: false, opensAt: '', closesAt: '' }
        : entry,
    );
    const missing = validateFacilitySettings(draft);
    expect(missing.openingHours.tuesday?.opensAt).toMatch(/opening time/i);
    expect(missing.openingHours.tuesday?.closesAt).toMatch(/closing time/i);
  });

  it('ignores times for days marked closed', () => {
    const draft = settingsToDraft(settings);
    draft.openingHours = draft.openingHours.map((entry) => ({
      ...entry,
      closed: true,
      opensAt: '',
      closesAt: '',
    }));
    expect(hasFacilitySettingsErrors(validateFacilitySettings(draft))).toBe(false);
  });
});

describe('asset decimal validation', () => {
  it('converts decimal XLM amounts to stroops without floating point', () => {
    expect(parseAssetAmount('1', 'XLM')).toEqual({ amountStroops: '10000000', error: null });
    expect(parseAssetAmount('27.5', 'XLM')).toEqual({ amountStroops: '275000000', error: null });
    expect(parseAssetAmount('0.0000001', 'XLM')).toEqual({ amountStroops: '1', error: null });
    expect(parseAssetAmount('123456.7654321', 'XLM')).toEqual({
      amountStroops: '1234567654321',
      error: null,
    });
  });

  it('accepts the same seven decimals for USDC', () => {
    expect(parseAssetAmount('2.0000001', 'USDC')).toEqual({
      amountStroops: '20000001',
      error: null,
    });
    expect(parseAssetAmount('2.00000001', 'USDC').error).toMatch(/at most 7 decimal places/i);
  });

  it('rejects over-precise, negative, zero and non-numeric amounts', () => {
    expect(parseAssetAmount('1.12345678', 'XLM').error).toMatch(/at most 7 decimal places/i);
    expect(parseAssetAmount('-1', 'XLM').error).toMatch(/positive amount/i);
    expect(parseAssetAmount('0', 'XLM').error).toMatch(/greater than 0/i);
    expect(parseAssetAmount('0.0000000', 'XLM').error).toMatch(/greater than 0/i);
    expect(parseAssetAmount('10,5', 'XLM').error).toMatch(/digits and a decimal point/i);
    expect(parseAssetAmount('abc', 'XLM').error).toMatch(/digits and a decimal point/i);
  });

  it('formats stroops back to the shortest exact decimal', () => {
    expect(formatAmountFromStroops('275000000', 'XLM')).toBe('27.5');
    expect(formatAmountFromStroops('20000001', 'USDC')).toBe('2.0000001');
    expect(formatAmountFromStroops('10000000', 'XLM')).toBe('1');
  });

  it('parses effective-from timestamps and rejects empty or invalid values', () => {
    const parsed = parseEffectiveFrom('2026-11-01T09:30');
    expect(parsed.error).toBeNull();
    expect(parsed.iso).toBe(new Date('2026-11-01T09:30').toISOString());
    expect(parseEffectiveFrom('').error).toMatch(/choose when/i);
    expect(parseEffectiveFrom('not-a-date').error).toMatch(/valid effective-from/i);
  });
});
