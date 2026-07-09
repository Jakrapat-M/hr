import { describe, expect, test } from 'vitest';
import { deriveEmployeeEligibility } from '@/lib/time/employee-eligibility';

describe('deriveEmployeeEligibility', () => {
  test('passes through clean gender + marital enums', () => {
    const e = deriveEmployeeEligibility(
      { gender: 'M', maritalStatus: 'married', hireDate: '2019-03-01' },
      '2026-06-22',
    );
    expect(e.gender).toBe('M');
    expect(e.maritalStatus).toBe('married');
  });

  test('derives whole-year YoS from hireDate via calcYearOfService', () => {
    const e = deriveEmployeeEligibility({ hireDate: '2019-03-01' }, '2026-06-22');
    // ~7 years between 2019-03 and 2026-06
    expect(e.yearsOfService).toBe(7);
  });

  test('exactly one year of service', () => {
    const e = deriveEmployeeEligibility({ hireDate: '2020-01-01' }, '2021-01-02');
    expect(e.yearsOfService).toBe(1);
  });

  test('missing hireDate → 0 YoS, no throw', () => {
    const e = deriveEmployeeEligibility({ gender: 'F' });
    expect(e.yearsOfService).toBe(0);
    expect(e.gender).toBe('F');
  });

  test('future hireDate → 0 YoS', () => {
    const e = deriveEmployeeEligibility({ hireDate: '2099-01-01' }, '2026-06-22');
    expect(e.yearsOfService).toBe(0);
  });

  test('absent enums stay undefined', () => {
    const e = deriveEmployeeEligibility({ hireDate: '2019-03-01' }, '2026-06-22');
    expect(e.gender).toBeUndefined();
    expect(e.maritalStatus).toBeUndefined();
  });
});
