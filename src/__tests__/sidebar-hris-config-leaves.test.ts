/**
 * Humi Journey EC/BE work-item #1 — HRIS System-Settings config surfaces.
 *
 * IA simplification (2026-06-10): the two HRIS configuration screens (Time
 * Policy, Benefit Catalog) were REMOVED as standalone System-group menu leaves
 * and nested under "ฐานข้อมูลกลาง" (Master Catalog, /admin/foundation) — reachable
 * as tiles on the Foundation landing. This shrinks the System group 6→4, one of
 * the stacked nav layers the user flagged as too complex.
 *
 * This test pins that decision:
 *   1. neither config screen is a Sidebar leaf anymore (no menu duplication),
 *   2. the System group keeps exactly its 4 simplified leaves,
 *   3. both config routes remain reachable from the Foundation landing page
 *      (no dead end — MENU removal must not orphan the screen).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { MODULES } from '@/components/humi/shell/Sidebar';

const ALL_LEAF_IDS = MODULES.flatMap((m) => m.leaves).map((l) => l.id);
const CONFIG_IDS = ['time-policy', 'benefit-catalog'] as const;
const CONFIG_ROUTES = ['/admin/system/time-policy', '/admin/system/benefit-catalog'] as const;

describe('HRIS config surfaces — nested under Master Catalog, not System leaves', () => {
  test.each(CONFIG_IDS)('“%s” is no longer a Sidebar leaf', (id) => {
    expect(ALL_LEAF_IDS).not.toContain(id);
  });

  test('the System group is the simplified 4: roles, catalog, docreview, audit', () => {
    const systemGroup = MODULES.find((m) => m.id === 'system');
    expect(systemGroup).toBeDefined();
    expect(systemGroup!.leaves.map((l) => l.id)).toEqual([
      'roles',
      'catalog',
      'docreview',
      'audit',
    ]);
  });

  test('both config routes stay reachable from the Foundation landing (no dead end)', () => {
    const foundationPage = readFileSync(
      join(process.cwd(), 'src/app/[locale]/admin/foundation/page.tsx'),
      'utf8',
    );
    for (const route of CONFIG_ROUTES) {
      // hrefs on the page carry a locale prefix (/th...); assert the bare route is linked.
      expect(foundationPage).toContain(route);
    }
  });
});
