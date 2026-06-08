/**
 * persona-tiers.test.ts — Req4 AC4.6 tier mapping.
 * A = hr_admin/hr_manager · B = hrbp/spd · C = manager · D = employee.
 */

import { describe, it, expect } from 'vitest';
import { personaTiers, tierChips, TIER_ORDER, PERSONA_ROLE } from '../persona-tiers';

describe('personaTiers / tierChips', () => {
  it('AC4.6: hr_admin includes tier A', () => {
    expect(tierChips(['hr_admin'])).toContain('A');
  });

  it('AC4.6: employee maps to only D', () => {
    expect(tierChips(['employee'])).toEqual(['D']);
  });

  it('hr_manager also maps to tier A', () => {
    expect(personaTiers(['hr_manager'])).toEqual(['A']);
  });

  it('people-partner roles map to tier B', () => {
    expect(personaTiers(['hrbp'])).toEqual(['B']);
    expect(personaTiers(['spd'])).toEqual(['B']);
  });

  it('manager maps to tier C', () => {
    expect(personaTiers(['manager'])).toEqual(['C']);
  });

  it('a super-user bundle chips all four tiers in canonical order', () => {
    expect(personaTiers(['hr_admin', 'hr_manager', 'spd', 'hrbp', 'manager', 'employee'])).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('dedupes when two roles share a tier (hr_admin + hr_manager → single A)', () => {
    expect(personaTiers(['hr_admin', 'hr_manager'])).toEqual(['A']);
  });

  it('always returns tiers in TIER_ORDER regardless of input order', () => {
    expect(personaTiers(['employee', 'manager', 'hr_admin'])).toEqual(['A', 'C', 'D']);
    expect(TIER_ORDER).toEqual(['A', 'B', 'C', 'D']);
  });

  it('tierChips is an alias of personaTiers', () => {
    expect(tierChips).toBe(personaTiers);
  });
});

describe('PERSONA_ROLE (AC-6.1: centralized persona id → app Role map)', () => {
  it('maps hris onto hr_manager (top admin tier; the former phantom sysadmin was collapsed into this)', () => {
    expect(PERSONA_ROLE.hris).toBe('hr_manager');
  });

  it('maps hradmin to hr_admin', () => {
    expect(PERSONA_ROLE.hradmin).toBe('hr_admin');
  });

  it('passes the remaining personas straight through to their like-named role', () => {
    expect(PERSONA_ROLE.employee).toBe('employee');
    expect(PERSONA_ROLE.manager).toBe('manager');
    expect(PERSONA_ROLE.hrbp).toBe('hrbp');
    expect(PERSONA_ROLE.spd).toBe('spd');
  });
});
