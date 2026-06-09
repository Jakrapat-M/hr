/**
 * Humi Journey EC/BE work-item #1 — HRIS System-Settings config leaves.
 *
 * The journey adds two dedicated HRIS configuration screens (Time Policy,
 * Benefit Catalog) under the System Settings group. They are gated to the `hris`
 * persona. This test pins MENU == GUARD: the `hris` persona sees both, and a
 * plain `employee` sees neither (remove-not-hide).
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

// app Role per persona (PERSONA_ROLE in lib/persona-tiers.ts): hris → hr_manager.
const HRIS: Role[] = ['hr_manager'];
const EMPLOYEE: Role[] = ['employee'];

const CONFIG_LEAVES = ['time-policy', 'benefit-catalog'] as const;

describe('HRIS config leaves — visible to hris, hidden from employee', () => {
  test.each(CONFIG_LEAVES)('%s is visible to hris and hidden from employee', (id) => {
    expect(leafVisible(leaf(id), HRIS)).toBe(true);
    expect(leafVisible(leaf(id), EMPLOYEE)).toBe(false);
  });

  test('each config leaf is gated to hris only and lives in the system group', () => {
    const systemGroup = MODULES.find((m) => m.id === 'system');
    expect(systemGroup).toBeDefined();
    for (const id of CONFIG_LEAVES) {
      const l = leaf(id);
      expect(l.show).toEqual(['hris']);
      expect(systemGroup!.leaves.some((x) => x.id === id)).toBe(true);
    }
  });

  test('config leaves point at their dedicated admin/system routes', () => {
    expect(leaf('time-policy').href).toBe('/admin/system/time-policy');
    expect(leaf('benefit-catalog').href).toBe('/admin/system/benefit-catalog');
  });
});
