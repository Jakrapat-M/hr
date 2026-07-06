/**
 * ec-maintain-registry.test.ts — STA-244
 * Registry assertions (cardinality / editMode / requiredDocs per the hand-authored
 * seed) plus a behavior-contract regression: the registry's editMode MUST match each
 * section's real /profile/me submit semantics (approval = submitChangeRequest only,
 * NO save(); direct = submitChangeRequest AND save()). A mislabeled seed row fails
 * the contract test.
 */

import { describe, it, expect } from 'vitest';
import {
  EC_MAINTAIN_REGISTRY,
  getMaintainConfig,
  type MaintainConfig,
} from '@/lib/ec-maintain-registry';

describe('EC_MAINTAIN_REGISTRY — seeded rows', () => {
  it('seeds exactly the 8 real ESS sections (no 88-row transcription, no defaults)', () => {
    const keys = EC_MAINTAIN_REGISTRY.map((c) => c.key).sort();
    expect(keys).toEqual(
      [
        'address',
        'advanced',
        'bank',
        'contact',
        'dependents',
        'emergencyContact',
        'marital',
        'personal',
      ].sort(),
    );
  });

  // AC-1 — repeatable (N) sections
  it('emergencyContact and dependents are cardinality N (repeatable)', () => {
    expect(getMaintainConfig('emergencyContact').cardinality).toBe('N');
    expect(getMaintainConfig('dependents').cardinality).toBe('N');
  });

  // AC-2 — single (1) sections
  it('address, bank and personal are cardinality 1 (single)', () => {
    expect(getMaintainConfig('address').cardinality).toBe(1);
    expect(getMaintainConfig('bank').cardinality).toBe(1);
    expect(getMaintainConfig('personal').cardinality).toBe(1);
  });

  // AC-3 — edit modes
  it('personal and marital are approval; address/bank/emergencyContact/dependents are direct', () => {
    expect(getMaintainConfig('personal').editMode).toBe('approval');
    expect(getMaintainConfig('marital').editMode).toBe('approval');
    expect(getMaintainConfig('address').editMode).toBe('direct');
    expect(getMaintainConfig('bank').editMode).toBe('direct');
    expect(getMaintainConfig('emergencyContact').editMode).toBe('direct');
    expect(getMaintainConfig('dependents').editMode).toBe('direct');
  });

  // AC-4 — required docs are non-empty exactly for the identity-gated sections
  it('requiredDocs is non-empty exactly for personal + marital (identity-gated); [] otherwise', () => {
    const withDocs = EC_MAINTAIN_REGISTRY.filter((c) => c.requiredDocs.length > 0)
      .map((c) => c.key)
      .sort();
    expect(withDocs).toEqual(['marital', 'personal'].sort());
    // and each doc value is an i18n key namespaced under ecMaintain
    for (const c of EC_MAINTAIN_REGISTRY) {
      for (const doc of c.requiredDocs) {
        expect(doc).toMatch(/^ecMaintain\./);
      }
    }
  });

  // contact — dual-purpose row handled via Architect option B
  it('contact is cardinalityIntrinsic (editMode presentation-only, approval)', () => {
    const contact = getMaintainConfig('contact');
    expect(contact.cardinalityIntrinsic).toBe(true);
    expect(contact.editMode).toBe('approval');
    expect(contact.requiredDocs).toEqual([]);
  });

  it('every row carries an sta82Ref for traceability', () => {
    for (const c of EC_MAINTAIN_REGISTRY) {
      expect(c.sta82Ref.section).toBeTruthy();
      expect(c.sta82Ref.subsection).toBeTruthy();
    }
  });

  it('getMaintainConfig throws for an unseeded key', () => {
    // @ts-expect-error — intentional invalid key
    expect(() => getMaintainConfig('termination')).toThrow(/No maintain config seeded/);
  });
});

// ── Behavior contract (regression guard) ─────────────────────────────────────────
// Ground truth transcribed from src/app/[locale]/profile/me/page.tsx submit handlers:
//   approval → submitChangeRequest ONLY (no save()) — handleSubmitSection (personal/
//              marital/contact-modal/advanced)
//   direct   → submitChangeRequest AND save()       — array/object editors
//              (address/bank/emergencyContact/dependents/contact-array)
// If a seed row is mislabeled (e.g. address flipped to 'approval'), this fails.
describe('EC_MAINTAIN_REGISTRY — editMode matches real submit semantics', () => {
  const EXPECTED_EDIT_MODE: Record<string, MaintainConfig['editMode']> = {
    personal: 'approval',
    marital: 'approval',
    contact: 'approval', // scalar modal path; the array card is intrinsic/direct
    advanced: 'approval',
    address: 'direct',
    bank: 'direct',
    emergencyContact: 'direct',
    dependents: 'direct',
  };

  it('each seeded section labels its editMode per the page submit handler it uses', () => {
    for (const [key, expected] of Object.entries(EXPECTED_EDIT_MODE)) {
      expect(getMaintainConfig(key as MaintainConfig['key']).editMode).toBe(expected);
    }
  });
});
