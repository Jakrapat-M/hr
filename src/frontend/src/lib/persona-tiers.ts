// lib/persona-tiers.ts — maps the RBAC Role union onto the 4 demo "tiers" the
// shell surfaces in the persona switcher + acting ribbon (Req2 + Req4).
//
//   A — System / HR Admin   : hr_admin, hr_manager  (top-tier config + records)
//   B — People Partners      : hrbp, spd            (BU partners + dev approvers)
//   C — Manager              : manager
//   D — Employee             : employee             (ESS baseline)
//
// A persona's tier SET is the union of every tier its roles map to, so a
// super-user (admin@ with all roles) chips A·B·C·D, while a plain employee
// chips only D. Used by PersonaSwitcher rows and the LoginAsRibbon SCOPE label.

import type { Role } from '@/lib/rbac';

export type PersonaTier = 'A' | 'B' | 'C' | 'D';

/** Canonical tier order for stable chip rendering. */
export const TIER_ORDER: PersonaTier[] = ['A', 'B', 'C', 'D'];

const ROLE_TIER: Record<Role, PersonaTier> = {
  hr_manager: 'A',
  hr_admin: 'A',
  spd: 'B',
  hrbp: 'B',
  manager: 'C',
  employee: 'D',
};

/** Blueprint persona ids. */
export type PersonaId = 'employee' | 'manager' | 'hrbp' | 'spd' | 'hradmin' | 'hris' | 'sysadmin';

/** Blueprint persona id → app Role. sysadmin maps to the top role so it sees
 *  every group; hris → hr_manager (master-data tier), hradmin → hr_admin. */
export const PERSONA_ROLE: Record<PersonaId, Role> = {
  employee: 'employee',
  manager: 'manager',
  hrbp: 'hrbp',
  spd: 'spd',
  hradmin: 'hr_admin',
  hris: 'hr_manager',
  sysadmin: 'hr_manager',
};

/** The set of tiers a role bundle unlocks, deduped + in canonical order. */
export function personaTiers(roles: Role[]): PersonaTier[] {
  const set = new Set<PersonaTier>();
  for (const r of roles) {
    const tier = ROLE_TIER[r];
    if (tier) set.add(tier);
  }
  return TIER_ORDER.filter((t) => set.has(t));
}

/** Alias kept for the task's API name — same output as personaTiers. */
export const tierChips = personaTiers;
