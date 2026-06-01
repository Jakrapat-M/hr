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
 *
 * ────────────────────────────────────────────────────────────────────────────
 * P3-9 — gating coverage matrix (regression gate).
 *
 * The block below EXTENDS the three P1 tests above with a full menu-vs-guard
 * matrix. It iterates EVERY leaf in the live Sidebar `MODULES` tree and, for any
 * leaf whose target route carries a real access guard, asserts that every
 * persona the menu shows the leaf to is actually ADMITTED by that route's REAL
 * guard predicate (imported from @/lib/rbac and @/lib/capabilities — never
 * re-implemented here, so the test has teeth).
 *
 * This permanently prevents the class of bug fixed in PR-216: SPD saw a
 * talent-search menu leaf, but /hrbp/talent-search is Capability-gated to HRBP
 * only → SPD hit a NotAuthorized dead-end. The matrix would have failed that.
 */

import { describe, expect, it } from 'vitest';
import { canAccessModule, hasAnyRole, hasRole, type Role } from '@/lib/rbac';
import { canDo, resolveCapabilities } from '@/lib/capabilities';
import { MODULES } from '@/components/humi/shell/Sidebar';
import { PERSONA_ROLE, type PersonaId } from '@/lib/persona-tiers';

/** The guard predicate for each P1-guarded route (post-PR1). */
const GUARD: Record<string, (roles: Role[]) => boolean> = {
  '/quick-approve': (roles) => canAccessModule(roles, 'quick-approve'),
  '/overtime': (roles) => hasAnyRole(roles, ['manager', 'hr_admin', 'hr_manager']),
  '/admin': (roles) => hasRole(roles, 'hr_admin'),
};

describe('AC-1.2 — P1 guard ⊇ menu show personas', () => {
  it('/quick-approve guard admits every persona the menu shows it to', () => {
    // Read the live `approvals` leaf show:[] from MODULES rather than hardcoding.
    const approvals = MODULES.flatMap((g) => g.leaves).find((l) => l.id === 'approvals');
    const show = approvals?.show ?? [];
    const denied = show.filter((p) => !GUARD['/quick-approve']([PERSONA_ROLE[p]]));
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

// ════════════════════════════════════════════════════════════════════════════
// P3-9 — FULL GATING COVERAGE MATRIX
// ════════════════════════════════════════════════════════════════════════════
//
// ROUTE_GUARDS maps a (bare, locale-less) route → the REAL guard predicate that
// the route's layout/page enforces. Each allowlist is TRANSCRIBED from the
// actual guard source (see the `// file:line` comment per entry) and calls the
// real rbac/capabilities predicate — so if the guard tightens/loosens, this map
// must be updated in lockstep, and any menu drift fails the matrix test below.
//
// Guard semantics reminder (src/lib/rbac.ts:9-18):
//   ROLE_HIERARCHY: hr_manager > hr_admin > spd > hrbp > manager > employee.
//   hasRole / hasAnyRole are HIERARCHY-AWARE. `roles.includes(x)` is EXACT-match
//   (no hierarchy) — used by the two routes that gate on the literal hr_manager.
//
const ROUTE_GUARDS: Record<string, (roles: Role[]) => boolean> = {
  // quick-approve/layout.tsx:20 → canAccessModule(roles,'quick-approve')
  //   MODULE_ACCESS['quick-approve'] = ['manager','hrbp','spd','hr_admin','hr_manager']
  '/quick-approve': (roles) => canAccessModule(roles, 'quick-approve'),

  // admin/layout.tsx:22 → hasRole(roles,'hr_admin') — guards ALL /admin/** routes
  '/admin': (roles) => hasRole(roles, 'hr_admin'),

  // manager/team/layout.tsx:22 → hasAnyRole(roles,['manager','hrbp','spd','hr_admin','hr_manager'])
  '/manager/team': (roles) =>
    hasAnyRole(roles, ['manager', 'hrbp', 'spd', 'hr_admin', 'hr_manager']),

  // manager/payroll-summary/layout.tsx:28 → hasAnyRole(roles,['manager','hr_admin','hr_manager'])
  //   (the canAccessModule('payroll-team-summary') half resolves to the same set)
  '/manager/payroll-summary': (roles) =>
    hasAnyRole(roles, ['manager', 'hr_admin', 'hr_manager']),

  // hrbp/employees/layout.tsx:22 → hasAnyRole(roles,['hrbp','spd','hr_admin','hr_manager'])
  '/hrbp/employees': (roles) => hasAnyRole(roles, ['hrbp', 'spd', 'hr_admin', 'hr_manager']),

  // hrbp/doc-review/layout.tsx:24 → hasAnyRole(roles,['spd','hr_admin','hr_manager'])
  '/hrbp/doc-review': (roles) => hasAnyRole(roles, ['spd', 'hr_admin', 'hr_manager']),

  // hrbp/talent-search/page.tsx:48 → <Capability action="talentSearch"> →
  //   canDo(resolveCapabilities(roles),'talentSearch'). Capabilities have NO role
  //   hierarchy: only the HRBP bundle sets talentSearch:true (capabilities.ts:165).
  //   SPD's bundle has no talentSearch (SF baseline §3 "No Background/Talent") → denied.
  '/hrbp/talent-search': (roles) => canDo(resolveCapabilities(roles), 'talentSearch'),

  // permissions/page.tsx:20 → roles.includes('hr_manager') — EXACT match, NOT
  //   hierarchy-aware. Only the literal hr_manager role is admitted.
  '/permissions': (roles) => roles.includes('hr_manager'),

  // admin/foundation/page.tsx:48 → admin/layout (hr_admin+) AND an inner
  //   roles.includes('hr_manager') EXACT gate. The tighter inner gate wins, so the
  //   effective guard is the exact hr_manager check.
  '/admin/foundation': (roles) => roles.includes('hr_manager'),
};

// NOTE (documented, not in the leaf matrix): bare /manager (e.g. /manager/dashboard)
// uses an EXACT roles.includes('manager'|'hr_admin'|'hr_manager') gate and redirects
// hrbp/spd to /home. No menu leaf points at bare /manager (my-team → /manager/team and
// team-payroll → /manager/payroll-summary are carved-out subtrees with their own
// hierarchy-aware guards above), so it need not appear in ROUTE_GUARDS.

/** The benefits-hub leaf uses the __BENEFITS__ sentinel href. Resolve it to its
 *  real bare route so longest-prefix matching can run; it is ungated (no entry in
 *  ROUTE_GUARDS), so it is skipped by the matrix regardless. */
const BENEFITS_HUB_ROUTE = '/benefits-hub';

/** Resolve a leaf.href to a bare, query/hash-stripped route for guard matching. */
function leafRoute(href: string): string {
  const raw = href === '__BENEFITS__' ? BENEFITS_HUB_ROUTE : href;
  return raw.replace(/[?#].*$/, '');
}

/** Longest-prefix match of a route against the ROUTE_GUARDS keys. Returns the
 *  matching guard key (e.g. '/admin' for '/admin/employees', '/admin/foundation'
 *  for the tighter inner gate) or null when the route has no guard entry. */
function matchGuardKey(route: string): string | null {
  let best: string | null = null;
  for (const key of Object.keys(ROUTE_GUARDS)) {
    if (route === key || route.startsWith(key + '/')) {
      if (best === null || key.length > best.length) best = key;
    }
  }
  return best;
}

describe('P3-9 — gating coverage matrix: menu show ⊆ route guard for every leaf', () => {
  const ALL_LEAVES = MODULES.flatMap((g) =>
    g.leaves.map((l) => ({ ...l, group: g.id })),
  );

  it('every persona a guarded leaf is shown to is ADMITTED by that route guard', () => {
    type Violation = {
      leaf: string;
      group: string;
      route: string;
      guardKey: string;
      persona: PersonaId;
    };
    const violations: Violation[] = [];
    let coveredLeaves = 0;

    for (const leaf of ALL_LEAVES) {
      const route = leafRoute(leaf.href);
      const guardKey = matchGuardKey(route);
      if (!guardKey) continue; // route has no guard → menu is the only gate (fine)
      coveredLeaves += 1;
      const guard = ROUTE_GUARDS[guardKey];
      // Omitted `show` = visible to everyone — but every guarded leaf in MODULES
      // carries an explicit `show`, so fall back to [] (no personas to check).
      const show = leaf.show ?? [];
      for (const persona of show) {
        if (!guard([PERSONA_ROLE[persona]])) {
          violations.push({
            leaf: leaf.id,
            group: leaf.group,
            route,
            guardKey,
            persona,
          });
        }
      }
    }

    // The matrix must cover at least the known guarded leaves; if this drops, a
    // leaf href changed out from under a guard (or a guard key regressed).
    expect(coveredLeaves).toBeGreaterThanOrEqual(8);

    // Empty = no menu-vs-guard mismatch. A non-empty list NAMES the offending
    // leaf + persona + route so the failure is self-diagnosing.
    expect(
      violations,
      `menu-vs-guard mismatch(es) — leaf shows a persona the route guard denies:\n` +
        violations
          .map(
            (v) =>
              `  • leaf '${v.leaf}' (group ${v.group}) → ${v.route} [guard ${v.guardKey}] ` +
              `shows persona '${v.persona}' (role ${PERSONA_ROLE[v.persona]}) but the guard DENIES it`,
          )
          .join('\n'),
    ).toEqual([]);
  });

  it('matrix covers the expected guarded leaves (baseline inventory)', () => {
    // The set of leaf ids whose target route is guarded by ROUTE_GUARDS, by
    // longest-prefix match. Pinned so adding/removing a guarded leaf is a
    // deliberate, reviewed change.
    const guardedLeafIds = ALL_LEAVES.filter((l) => matchGuardKey(leafRoute(l.href)) !== null)
      .map((l) => l.id)
      .sort();
    expect(guardedLeafIds).toEqual(
      [
        'approvals', // → /quick-approve
        'audit', // → /admin/system (under the /admin guard)
        'benefits-admin', // → /admin/benefits
        'catalog', // → /admin/foundation (tighter inner gate wins)
        'changes', // → /admin/change-requests
        'docreview', // → /hrbp/doc-review
        'employees', // → /admin/employees
        'employees-bu', // → /hrbp/employees
        'hire', // → /admin/hire
        'hr-docs', // → /admin/documents
        'my-team', // → /manager/team
        'roles', // → /permissions
        'talent-search', // → /hrbp/talent-search
        'team-payroll', // → /manager/payroll-summary
      ].sort(),
    );
  });
});

// ── PR-216 regression pin (talent-search must never show SPD) ────────────────
describe('P3-9 — PR-216 regression pin: talent-search excludes SPD', () => {
  const talentSearch = MODULES.flatMap((g) => g.leaves).find((l) => l.id === 'talent-search');

  it('the talent-search guard DENIES a hypothetical spd persona', () => {
    expect(ROUTE_GUARDS['/hrbp/talent-search']([PERSONA_ROLE.spd])).toBe(false);
  });

  it('the live talent-search leaf does NOT show itself to spd', () => {
    expect(talentSearch).toBeDefined();
    expect(talentSearch?.show ?? []).not.toContain('spd');
  });

  it('the talent-search guard ADMITS hrbp (the only Capability holder)', () => {
    expect(ROUTE_GUARDS['/hrbp/talent-search']([PERSONA_ROLE.hrbp])).toBe(true);
  });
});

// ── Known guarded-but-not-menu-reachable routes (orphan inventory) ───────────
// Routes that carry a real guard but are intentionally NOT reachable from a
// Sidebar leaf — sub-routes, detail pages, import flows, or legacy persona
// dashboards. Documented so a NEWLY-orphaned guarded route stands out in review
// (a route that should have a leaf but lost one would not be on this list).
// This is a documentation pin, not a dynamic crawler — keep it pragmatic.
export const KNOWN_ORPHAN_GUARDED: readonly string[] = [
  '/quick-approve/bulk', // bulk-approve sub-route of the approvals inbox
  '/workflows/pay-rate/[id]', // workflow detail page (reached from the inbox row)
  '/workflows/tax-planning/[id]', // workflow detail page (reached from the inbox row)
  '/overtime', // OT request flow — sub-feature of /timeoff, no own leaf
  '/payroll/import', // payroll data import — reached from the Payroll module
  '/time/import', // attendance import — reached from Time & Attendance
  '/hrbp/dashboard', // legacy People-Partner landing (superseded by group entries)
  '/admin/users/role-groups', // admin sub-page (reached from /permissions)
  '/admin/system/notifications', // admin sub-page (reached from /admin/system)
  '/admin/system/security/audit', // admin sub-page (reached from /admin/system)
] as const;

describe('P3-9 — orphan-guarded inventory is documented', () => {
  it('lists known guarded-but-leafless routes (so a new orphan is noticed in review)', () => {
    // No menu leaf should point at any documented orphan route — they are
    // intentionally URL-only. If a leaf starts pointing at one, the orphan list
    // is stale and should be revisited.
    const leafRoutes = new Set(MODULES.flatMap((g) => g.leaves).map((l) => leafRoute(l.href)));
    const nowReachable = KNOWN_ORPHAN_GUARDED.filter((r) => leafRoutes.has(r));
    expect(nowReachable).toEqual([]);
    // Sanity: the inventory is non-empty and unique.
    expect(KNOWN_ORPHAN_GUARDED.length).toBeGreaterThan(0);
    expect(new Set(KNOWN_ORPHAN_GUARDED).size).toBe(KNOWN_ORPHAN_GUARDED.length);
  });
});
