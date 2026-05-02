import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '@/lib/capabilities';

// Source of truth: extracted-context-2026-05-02/01-sf-system-baseline.md §3
// 75 entities × 4 personas = 300 OData probes against live SF (Ken/Rungrote/Apinya/Worawee).

describe('resolveCapabilities — SF RBAC matrix', () => {
  it('Manager has zero visibility on BenefitEmployeeClaim (SF probe truth)', () => {
    const caps = resolveCapabilities(['manager', 'employee']);
    expect(caps.entities.BenefitEmployeeClaim).toBe('hidden');
    expect(caps.entities.EmpCompensation).toBe('hidden');
    expect(caps.entities.PerNationalId).toBe('hidden');
    expect(caps.entities.Background).toBe('hidden');
  });

  it('Manager cannot bulk-approve, reroute, or override', () => {
    const caps = resolveCapabilities(['manager', 'employee']);
    expect(caps.actions.bulkApprove).toBe(false);
    expect(caps.actions.reroute).toBe(false);
    expect(caps.actions.override).toBe(false);
    expect(caps.actions.talentSearch).toBe(false);
  });

  it('SPD sees BenefitEmployeeClaim (38f) and can bulk-approve', () => {
    const caps = resolveCapabilities(['spd', 'employee']);
    expect(caps.entities.BenefitEmployeeClaim).toBe('partial');
    expect(caps.actions.bulkApprove).toBe(true);
    expect(caps.actions.override).toBe(true);
  });

  it('SPD does NOT have Talent Search (HRBP-only)', () => {
    const caps = resolveCapabilities(['spd', 'employee']);
    expect(caps.actions.talentSearch).toBe(false);
    expect(caps.entities.Background).toBe('hidden');
  });

  it('HRBP has parity with HR Admin on key entities + Talent Search', () => {
    const caps = resolveCapabilities(['hrbp', 'employee']);
    expect(caps.entities.EmpEmployment).toBe('full');
    expect(caps.entities.EmpJob).toBe('full');
    expect(caps.entities.PerPersonal).toBe('full');
    expect(caps.entities.Background).toBe('full');
    expect(caps.actions.talentSearch).toBe(true);
  });

  it('HR Admin has full visibility but no system config', () => {
    const caps = resolveCapabilities(['hr_admin']);
    expect(caps.entities.BenefitEmployeeClaim).toBe('full');
    expect(caps.entities.PerNationalId).toBe('full');
    expect(caps.actions.systemConfig).toBe(false);
    expect(caps.queueScope).toBe('enterprise');
  });

  it('HRIS Admin (hr_manager) gets system config on top of HR Admin', () => {
    const caps = resolveCapabilities(['hr_manager']);
    expect(caps.entities.BenefitEmployeeClaim).toBe('full');
    expect(caps.actions.systemConfig).toBe(true);
    expect(caps.actions.editFoundation).toBe(true);
  });

  it('admin@ multi-role merges to highest-privilege bundle', () => {
    // admin user has [hr_admin, hr_manager, spd, hrbp, manager, employee]
    const caps = resolveCapabilities([
      'hr_admin',
      'hr_manager',
      'spd',
      'hrbp',
      'manager',
      'employee',
    ]);
    expect(caps.entities.BenefitEmployeeClaim).toBe('full');
    expect(caps.actions.systemConfig).toBe(true);
    expect(caps.actions.talentSearch).toBe(true);
    expect(caps.queueScope).toBe('enterprise');
  });

  it('Empty role array returns no-access bundle', () => {
    const caps = resolveCapabilities([]);
    expect(caps.entities.BenefitEmployeeClaim).toBe('hidden');
    expect(caps.actions.view).toBe(false);
    expect(caps.queueScope).toBe('self');
  });

  it('Foundation entities are universal-read for any logged-in role', () => {
    expect(resolveCapabilities(['employee']).entities.Foundation).toBe('full');
    expect(resolveCapabilities(['manager']).entities.Foundation).toBe('full');
    expect(resolveCapabilities(['hr_admin']).entities.Foundation).toBe('full');
  });
});
