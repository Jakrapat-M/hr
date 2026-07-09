import { describe, it, expect } from 'vitest';
import { MODULES } from '@/components/humi/shell/Sidebar';

/**
 * STA-94 — Foundation IA placement guard.
 *
 * The Foundation / Master-Catalog setup (`/admin/foundation`) is org-structure
 * admin configuration. It must live under the **System (ระบบ)** nav group and
 * must NEVER be placed under the personal **workspace / "ฉัน" (ME)** group.
 *
 * This is a forward-looking IA requirement: the current placement is already
 * correct, so these assertions lock it against a future regression that moves
 * the leaf into the ME journey.
 */

const FOUNDATION_HREF = '/admin/foundation';

const group = (id: string) => MODULES.find((g) => g.id === id);
const hrefsOf = (id: string) => (group(id)?.leaves ?? []).map((leaf) => leaf.href);

describe('STA-94 — Foundation IA placement guard', () => {
  it('Foundation lives under the System (ระบบ) group', () => {
    expect(group('system')).toBeDefined();
    expect(hrefsOf('system')).toContain(FOUNDATION_HREF);
  });

  it('Foundation is NOT under the workspace / "ฉัน" (ME) group', () => {
    expect(group('workspace')).toBeDefined();
    expect(hrefsOf('workspace')).not.toContain(FOUNDATION_HREF);
  });

  it('Foundation appears in exactly one group — System only', () => {
    const groupsWithFoundation = MODULES
      .filter((g) => g.leaves.some((leaf) => leaf.href === FOUNDATION_HREF))
      .map((g) => g.id);
    expect(groupsWithFoundation).toEqual(['system']);
  });
});
