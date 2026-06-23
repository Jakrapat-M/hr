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

  it('launches with exactly one enabled subject: employee-change', () => {
    const enabled = IMPORT_SUBJECTS.filter((s) => !s.disabled);
    expect(enabled.map((s) => s.key)).toEqual(['employee-change']);
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

  it('benefit-plan is registered but flagged disabled (Coming soon, no config)', () => {
    const benefit = getImportSubject('benefit-plan');
    expect(benefit).toBeDefined();
    expect(benefit?.disabled).toBe(true);
    expect(benefit?.useConfig).toBeUndefined();
  });

  it('lookup by key returns the right subject; unknown key → undefined', () => {
    expect(getImportSubject('employee-change')?.key).toBe('employee-change');
    expect(getImportSubject('does-not-exist')).toBeUndefined();
    expect(getImportSubject(null)).toBeUndefined();
    expect(getImportSubject(undefined)).toBeUndefined();
  });
});
