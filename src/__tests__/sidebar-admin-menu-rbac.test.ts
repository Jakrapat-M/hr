/**
 * P2 Item 3 — Sidebar menu = route guard (remove-not-hide).
 *
 * The /admin/** subtree is gated to hr_admin+ by admin/layout.tsx (and the
 * change-requests in-page guard). Several Sidebar leaves used to be SHOWN to
 * People-Partner personas (hrbp/spd) whose route guard BLOCKS them — the menu
 * offered a route that dead-ends in <AccessDenied>. This test pins the cut so
 * MENU == GUARD: hrbp/spd must NOT see those admin leaves, and the personas
 * that legitimately keep them still do.
 */

import { describe, expect, test } from 'vitest';

import { MODULES, leafVisible } from '@/components/humi/shell/Sidebar';
import type { Role } from '@/lib/rbac';

const ALL_LEAVES = MODULES.flatMap((m) => m.leaves);

function leaf(id: string) {
  const found = ALL_LEAVES.find((l) => l.id === id);
  if (!found) throw new Error(`leaf '${id}' not found in MODULES`);
  return found;
}

// app Role per persona, matching PERSONA_ROLE in lib/persona-tiers.ts
const HRBP: Role[] = ['hrbp'];
const SPD: Role[] = ['spd'];
const HR_ADMIN: Role[] = ['hr_admin']; // hradmin persona
const HR_MANAGER: Role[] = ['hr_manager']; // hris persona (top admin tier)

describe('P2 Item 3 — admin leaves cut from personas their route guard blocks', () => {
  test('benefits-admin no longer shown to hrbp/spd (admin/layout gates hr_admin+)', () => {
    expect(leafVisible(leaf('benefits-admin'), HRBP)).toBe(false);
    expect(leafVisible(leaf('benefits-admin'), SPD)).toBe(false);
    // legitimate admin personas keep it
    expect(leafVisible(leaf('benefits-admin'), HR_ADMIN)).toBe(true);
    expect(leafVisible(leaf('benefits-admin'), HR_MANAGER)).toBe(true);
  });

  test('hr-docs no longer shown to hrbp', () => {
    expect(leafVisible(leaf('hr-docs'), HRBP)).toBe(false);
    expect(leafVisible(leaf('hr-docs'), HR_ADMIN)).toBe(true);
  });

  test('audit no longer shown to hrbp/spd', () => {
    expect(leafVisible(leaf('audit'), HRBP)).toBe(false);
    expect(leafVisible(leaf('audit'), SPD)).toBe(false);
    expect(leafVisible(leaf('audit'), HR_ADMIN)).toBe(true);
    expect(leafVisible(leaf('audit'), HR_MANAGER)).toBe(true);
  });

  test('docreview is shown to spd again (P4 PR-4: doc-review split to /hrbp/doc-review)', () => {
    // The deferred URL split is done — docreview now points at /hrbp/doc-review,
    // a route whose own guard admits spd, so SPD sees the leaf again.
    expect(leafVisible(leaf('docreview'), SPD)).toBe(true);
    // hris (hr_manager) keeps it
    expect(leafVisible(leaf('docreview'), HR_MANAGER)).toBe(true);
  });

  test('changes (/admin/change-requests) stays cut from hrbp (in-page guard excludes hrbp)', () => {
    expect(leafVisible(leaf('changes'), HRBP)).toBe(false);
    expect(leafVisible(leaf('changes'), HR_ADMIN)).toBe(true);
  });
});

describe('P2 Item 3 — hrbp/spd are not stranded with zero legitimate menu entries', () => {
  test('hrbp still sees its real leaves', () => {
    expect(leafVisible(leaf('approvals'), HRBP)).toBe(true); // /quick-approve umbrella
    expect(leafVisible(leaf('employees-bu'), HRBP)).toBe(true); // BU-scoped registry
    expect(leafVisible(leaf('reports'), HRBP)).toBe(true);
  });

  test('spd still sees its real leaves', () => {
    expect(leafVisible(leaf('approvals'), SPD)).toBe(true);
    expect(leafVisible(leaf('employees-bu'), SPD)).toBe(true);
    expect(leafVisible(leaf('reports'), SPD)).toBe(true);
  });
});

describe('P4 Item 3 — People-Partner menu surfaces talent-search + benefits reports', () => {
  const EMPLOYEE: Role[] = ['employee'];
  const MANAGER: Role[] = ['manager'];

  test('talent-search leaf shown to hrbp only (SPD excluded — capabilities.ts SPD bundle has no talentSearch)', () => {
    expect(leafVisible(leaf('talent-search'), HRBP)).toBe(true);
    // D1 fix: SPD must NOT see talent-search — /hrbp/talent-search is Capability-gated
    // talentSearch which the SPD bundle lacks (SF baseline §3: 'No Background/Talent'),
    // so showing it dead-ends SPD on NotAuthorized (remove-not-hide).
    expect(leafVisible(leaf('talent-search'), SPD)).toBe(false);
    // remove-not-hide: non-People-Partner personas do NOT see it
    expect(leafVisible(leaf('talent-search'), EMPLOYEE)).toBe(false);
    expect(leafVisible(leaf('talent-search'), MANAGER)).toBe(false);
    expect(leafVisible(leaf('talent-search'), HR_ADMIN)).toBe(false);
    // strict: pin the show array so coverage can't silently erode back to including spd
    expect(leaf('talent-search').show).toEqual(['hrbp']);
  });

  test('benefits-reports leaf shown to hrbp + spd only', () => {
    expect(leafVisible(leaf('benefits-reports'), HRBP)).toBe(true);
    expect(leafVisible(leaf('benefits-reports'), SPD)).toBe(true);
    expect(leafVisible(leaf('benefits-reports'), EMPLOYEE)).toBe(false);
    expect(leafVisible(leaf('benefits-reports'), MANAGER)).toBe(false);
    expect(leafVisible(leaf('benefits-reports'), HR_ADMIN)).toBe(false);
  });

  test('both new leaves point at the existing hrbp routes', () => {
    expect(leaf('talent-search').href).toBe('/hrbp/talent-search');
    expect(leaf('benefits-reports').href).toBe('/hrbp/benefits/reports');
  });

  test('every persona retains at least one visible leaf', () => {
    for (const roles of [HRBP, SPD, HR_ADMIN, HR_MANAGER, ['manager'] as Role[], ['employee'] as Role[]]) {
      const visibleCount = ALL_LEAVES.filter((l) => leafVisible(l, roles)).length;
      expect(visibleCount).toBeGreaterThan(0);
    }
  });
});
