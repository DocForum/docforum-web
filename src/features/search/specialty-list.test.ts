import { describe, expect, it } from 'vitest';
import { formatSpecialtyList } from './specialty-list';

describe('formatSpecialtyList', () => {
  it('handles 0, 1, 2 and 3+ names', () => {
    expect(formatSpecialtyList([])).toBe('');
    expect(formatSpecialtyList(['Dermatology'])).toBe('Dermatology');
    expect(formatSpecialtyList(['Dermatology', 'Allergy & immunology'])).toBe(
      'Dermatology and Allergy & immunology',
    );
    expect(formatSpecialtyList(['Cardiology', 'General practice', 'Paediatrics'])).toBe(
      'Cardiology, General practice and Paediatrics',
    );
  });
});
