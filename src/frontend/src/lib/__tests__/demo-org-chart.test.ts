import { describe, expect, test } from 'vitest';
import { lookupEmployee, lookupManagerId, lookupName } from '../demo-org-chart';

describe('lookupEmployee', () => {
  test('returns Wichai for emp-042', () => {
    const emp = lookupEmployee('emp-042');
    expect(emp).not.toBeNull();
    expect(emp!.nameEn).toBe('Wichai Thamdee');
    expect(emp!.nameTh).toBe('วิชัย ทำดี');
  });

  test('returns null for unknown id', () => {
    expect(lookupEmployee('nope')).toBeNull();
  });
});

describe('lookupManagerId', () => {
  test('returns mgr-007 for emp-042', () => {
    expect(lookupManagerId('emp-042')).toBe('mgr-007');
  });

  test('returns "demo" for unknown employee id', () => {
    expect(lookupManagerId('unknown')).toBe('demo');
  });

  test('returns "demo" for mgr-007 (top-level manager)', () => {
    expect(lookupManagerId('mgr-007')).toBe('demo');
  });
});

describe('lookupName', () => {
  test('returns Thai name for mgr-007 in th locale', () => {
    expect(lookupName('mgr-007', 'th')).toBe('ผ่องศรี เก่งงาน');
  });

  test('returns English name for mgr-007 in en locale', () => {
    expect(lookupName('mgr-007', 'en')).toBe('Phongsri Kengngan');
  });

  test('falls back to id when employee not found', () => {
    expect(lookupName('xyz-999', 'th')).toBe('xyz-999');
    expect(lookupName('xyz-999', 'en')).toBe('xyz-999');
  });
});
