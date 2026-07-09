import { describe, it, expect } from 'vitest';
import {
  IMPORT_SUBJECTS,
  getImportSubject,
} from '@/components/admin/import/subject-registry';

describe('STA-136 — Bulk Import subject registry', () => {
  it('every subject has a unique, non-empty key', () => {
    const keys = IMPORT_SUBJECTS.map((s) => s.key);
    expect(keys.every((k) => k.length > 0)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every subject has non-empty TH + EN label and description', () => {
    for (const s of IMPORT_SUBJECTS) {
      expect(s.labelTh.trim().length).toBeGreaterThan(0);
      expect(s.labelEn.trim().length).toBeGreaterThan(0);
      expect(s.descTh.trim().length).toBeGreaterThan(0);
      expect(s.descEn.trim().length).toBeGreaterThan(0);
    }
  });

  // STA-115 — benefit-plan subject is now LIVE (was a Coming-soon card under STA-136).
  it('launches with two enabled subjects: employee-change + benefit-plan', () => {
    const enabled = IMPORT_SUBJECTS.filter((s) => !s.disabled);
    expect(enabled.map((s) => s.key).sort()).toEqual(['benefit-plan', 'employee-change']);
  });

  it('enabled subjects carry a useConfig hook; disabled subjects do not', () => {
    for (const s of IMPORT_SUBJECTS) {
      if (s.disabled) {
        expect(s.useConfig).toBeUndefined();
      } else {
        expect(typeof s.useConfig).toBe('function');
      }
    }
  });

  it('benefit-plan is registered, enabled, and carries a config hook (STA-115)', () => {
    const benefit = getImportSubject('benefit-plan');
    expect(benefit).toBeDefined();
    expect(benefit?.disabled).toBeFalsy();
    expect(typeof benefit?.useConfig).toBe('function');
  });

  it('lookup by key returns the right subject; unknown key → undefined', () => {
    expect(getImportSubject('employee-change')?.key).toBe('employee-change');
    expect(getImportSubject('does-not-exist')).toBeUndefined();
    expect(getImportSubject(null)).toBeUndefined();
    expect(getImportSubject(undefined)).toBeUndefined();
  });
});
