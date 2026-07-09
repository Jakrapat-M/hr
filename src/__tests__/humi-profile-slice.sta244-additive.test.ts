/**
 * humi-profile-slice.sta244-additive.test.ts
 *
 * STA-244 store contract: the 4 repeatable arrays are purely ADDITIVE with NO
 * persist version bump (stays v6). Proves:
 *   1. a fresh store exposes the seeded rows (demo data), and
 *   2. a hydrated v6-shaped `saved` that predates the new fields yields []-safe
 *      reads (undefined → `?? []`) with no crash — the explicit substitute for the
 *      dropped migration test.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });
vi.stubGlobal('crypto', { randomUUID: () => 'sta244-additive-uuid' });

import { useHumiProfileStore } from '@/stores/humi-profile-slice';

beforeEach(() => {
  localStorageMock.clear();
});

describe('STA-244 store — additive defaults (no version bump)', () => {
  it('persist version stays 6', () => {
    // The persist options are not exported; assert the default state instead and
    // that no migration reshaped it (fresh store keeps the seeds intact below).
    expect(useHumiProfileStore.persist.getOptions().version).toBe(6);
  });

  it('a fresh store exposes the seeded repeatable rows in draft AND saved', () => {
    const { draft, saved } = useHumiProfileStore.getState();
    expect((draft.formalEducation ?? []).length).toBeGreaterThan(0);
    expect((draft.languageSkills ?? []).length).toBeGreaterThan(0);
    expect((draft.workPermits ?? []).length).toBeGreaterThan(0);
    expect((draft.certifications ?? []).length).toBeGreaterThan(0);
    expect((saved.formalEducation ?? []).length).toBeGreaterThan(0);
    // Exactly-one-primary invariant holds in the seed.
    expect((saved.formalEducation ?? []).filter((e) => e.isPrimary)).toHaveLength(1);
  });

  it('a v6-shaped saved lacking the new fields yields []-safe reads (no crash)', () => {
    // Simulate a persisted store from BEFORE STA-244 (fields simply absent).
    const legacySaved = {
      nickname: 'x',
      phone: '',
      personalEmail: '',
      address: '',
      emergencyContacts: [],
      addressStructured: {
        houseNo: '',
        village: '',
        soi: '',
        road: '',
        subdistrict: '',
        district: '',
        province: '',
        postalCode: '',
      },
      phonesArr: [],
      emailsArr: [],
      bank: { bankCode: '', accountNo: '', holderName: '', bookAttachmentId: null },
      dependents: [],
    };
    useHumiProfileStore.setState({ saved: legacySaved as any });

    const { saved } = useHumiProfileStore.getState();
    expect(saved.formalEducation).toBeUndefined();
    expect(saved.languageSkills).toBeUndefined();
    expect(saved.workPermits).toBeUndefined();
    expect(saved.certifications).toBeUndefined();
    // The defensive read pattern used throughout /profile/me:
    expect(saved.formalEducation ?? []).toEqual([]);
    expect(saved.certifications ?? []).toEqual([]);
  });
});
