/**
 * AC-1.2 — guard-vs-menu coverage gate (PR-1).
 *
 * For each route that PR-1 guards, assert the guard's allowed roles ⊇ the
 * Sidebar leaf's `show:[]` personas (post-PR1 state). i.e. every persona the
 * menu SHOWS the leaf to must actually PASS the route guard — no "menu shows it
 * but the guard blocks it" dead-ends.
 *
 * Routes covered (the ones PR-1 fixes):
 *   /quick-approve  → canAccessModule(roles,'quick-approve')   (quick-approve/layout.tsx)
 *   /overtime       → hasAnyRole(roles,['manager','hr_admin','hr_manager'])  (overtime/page.tsx)
 *   /admin/**       → hasRole(roles,'hr_admin')                 (admin/layout.tsx)
 *
 * Persona→Role map mirrors Sidebar PERSONA_ROLE: hradmin→hr_admin, hris→hr_manager,
 * sysadmin→hr_manager, others identity.
 */

import { describe, expect, it } from 'vitest';
import { canAccessModule, hasAnyRole, hasRole, type Role } from '@/lib/rbac';

type PersonaId = 'employee' | 'manager' | 'hrbp' | 'spd' | 'hradmin' | 'hris' | 'sysadmin';

const PERSONA_ROLE: Record<PersonaId, Role> = {
  employee: 'employee',
  manager: 'manager',
  hrbp: 'hrbp',
  spd: 'spd',
  hradmin: 'hr_admin',
  hris: 'hr_manager',
  sysadmin: 'hr_manager',
};

/** The Sidebar `show:[]` personas for each P1-guarded leaf (verified Sidebar.tsx). */
const LEAF_SHOW: Record<string, PersonaId[]> = {
  // approvals leaf (Sidebar id 'approvals')
  '/quick-approve': ['manager', 'hrbp', 'hradmin', 'hris', 'spd', 'sysadmin'],
};

/** The guard predicate for each P1-guarded route (post-PR1). */
const GUARD: Record<string, (roles: Role[]) => boolean> = {
  '/quick-approve': (roles) => canAccessModule(roles, 'quick-approve'),
  '/overtime': (roles) => hasAnyRole(roles, ['manager', 'hr_admin', 'hr_manager']),
  '/admin': (roles) => hasRole(roles, 'hr_admin'),
};

describe('AC-1.2 — P1 guard ⊇ menu show personas', () => {
  it('/quick-approve guard admits every persona the menu shows it to', () => {
    const denied = LEAF_SHOW['/quick-approve'].filter(
      (p) => !GUARD['/quick-approve']([PERSONA_ROLE[p]]),
    );
    expect(denied).toEqual([]);
  });

  it('/overtime guard admits the OT-approver personas (manager + HR), denies employee', () => {
    // Overtime has no Sidebar leaf, but the guard must admit manager/HR approvers.
    expect(GUARD['/overtime'](['manager'])).toBe(true);
    expect(GUARD['/overtime'](['hr_admin'])).toBe(true);
    expect(GUARD['/overtime'](['hr_manager'])).toBe(true);
    expect(GUARD['/overtime'](['employee'])).toBe(false);
  });

  it('/admin guard admits hr_admin and (via hierarchy) hr_manager, denies employee/manager', () => {
    expect(GUARD['/admin'](['hr_admin'])).toBe(true);
    expect(GUARD['/admin'](['hr_manager'])).toBe(true); // hierarchy fix (was includes-only)
    expect(GUARD['/admin'](['employee'])).toBe(false);
    expect(GUARD['/admin'](['manager'])).toBe(false);
  });
});
