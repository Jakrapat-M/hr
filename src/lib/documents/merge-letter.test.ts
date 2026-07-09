import { describe, it, expect } from 'vitest';
import { mergeLetter, letterToHtml, mockHireDate, type MergeOptions } from './merge-letter';
import { getGeneratableLetter, GENERATABLE_LETTERS } from '@/data/documents/templates';
import type { CnextEmployee } from '@/lib/cnext-mock-data';

// Employee fixture WITH a hireDate (SF-real shape) — exercises full substitution.
const empFull: CnextEmployee = {
  id: 'emp-test-1',
  employeeCode: 'CG-9001',
  firstNameTh: 'สมชาย',
  lastNameTh: 'ใจดี',
  firstNameEn: 'Somchai',
  lastNameEn: 'Jaidee',
  initials: 'สใ',
  position: 'วิศวกรซอฟต์แวร์',
  jobTitle: 'Software Engineer',
  department: 'เทคโนโลยีสารสนเทศ',
  status: 'active',
  avatarTone: 'teal',
  hireDate: '2021-03-15',
};

// Synthetic-core fixture WITHOUT hireDate — exercises missingFields.
const empNoHire: CnextEmployee = {
  id: 'emp-test-2',
  employeeCode: 'CG-9002',
  firstNameTh: 'วิไล',
  lastNameTh: 'สุข',
  initials: 'วส',
  position: 'นักบัญชี',
  department: 'การเงิน',
  status: 'active',
  avatarTone: 'indigo',
};

const FIXED_TODAY = '31 พฤษภาคม 2569';
const baseOpts: MergeOptions = { today: FIXED_TODAY };

describe('mergeLetter', () => {
  it('substitutes every placeholder from real employee fields (TH)', () => {
    const tpl = getGeneratableLetter('employment-cert')!;
    const { title, filledBody, missingFields } = mergeLetter(tpl, empFull, 'th', baseOpts);

    expect(title).toBe('หนังสือรับรองการทำงาน');
    expect(filledBody).toContain('สมชาย ใจดี');
    expect(filledBody).toContain('CG-9001');
    expect(filledBody).toContain('วิศวกรซอฟต์แวร์');
    expect(filledBody).toContain('เทคโนโลยีสารสนเทศ');
    expect(filledBody).toContain('บริษัท เซ็นทรัล กรุ๊ป จำกัด');
    expect(filledBody).toContain(FIXED_TODAY);
    expect(filledBody).not.toContain('{{');
    expect(missingFields).toEqual([]);
  });

  it('uses EN names/title and Buddhist-era date in EN locale', () => {
    const tpl = getGeneratableLetter('relieving-letter')!;
    const { title, filledBody } = mergeLetter(tpl, empFull, 'en', baseOpts);

    expect(title).toBe('Relieving / Experience Letter');
    expect(filledBody).toContain('Somchai Jaidee');
    expect(filledBody).toContain('Software Engineer');
    expect(filledBody).toContain('Central Group Co., Ltd.');
    // EN locale renders Gregorian year via formatDate('long','en')
    expect(filledBody).toContain('15 March 2021');
    expect(filledBody).not.toContain('{{');
  });

  it('reports missingFields when an employee field is absent', () => {
    const tpl = getGeneratableLetter('employment-cert')!;
    const { filledBody, missingFields } = mergeLetter(tpl, empNoHire, 'th', baseOpts);

    expect(missingFields).toContain('startDate');
    expect(filledBody).toContain('____________');
    // present fields still merged
    expect(filledBody).toContain('CG-9002');
  });

  it('fills startDate and drops it from missingFields when opts.hireDate is supplied', () => {
    const tpl = getGeneratableLetter('employment-cert')!;

    // Without a hireDate source → startDate is missing.
    const without = mergeLetter(tpl, empNoHire, 'th', baseOpts);
    expect(without.missingFields).toContain('startDate');

    // Supplying opts.hireDate fills it and removes it from missingFields.
    const withHire = mergeLetter(tpl, empNoHire, 'th', { ...baseOpts, hireDate: '2018-07-09' });
    expect(withHire.missingFields).not.toContain('startDate');
    expect(withHire.filledBody).toContain('2561'); // Buddhist-era year for 2018
  });

  it('reports salary missing when no salaryMonthly supplied; fills it when given', () => {
    const tpl = getGeneratableLetter('salary-cert')!;

    const without = mergeLetter(tpl, empFull, 'th', baseOpts);
    expect(without.missingFields).toContain('salary');

    const withSalary = mergeLetter(tpl, empFull, 'th', { ...baseOpts, salaryMonthly: 45000 });
    expect(withSalary.missingFields).not.toContain('salary');
    expect(withSalary.filledBody).toContain('45,000');
  });

  it('is deterministic for a fixed today param (no live clock)', () => {
    const tpl = getGeneratableLetter('probation-pass')!;
    const a = mergeLetter(tpl, empFull, 'th', baseOpts);
    const b = mergeLetter(tpl, empFull, 'th', baseOpts);
    expect(a.filledBody).toBe(b.filledBody);
    expect(a.filledBody).toContain(FIXED_TODAY);
  });

  it('every curated letter has TH+EN bodies and a non-empty placeholder list', () => {
    expect(GENERATABLE_LETTERS.length).toBeGreaterThanOrEqual(3);
    for (const l of GENERATABLE_LETTERS) {
      expect(l.bodyTh.length).toBeGreaterThan(0);
      expect(l.bodyEn.length).toBeGreaterThan(0);
      expect(l.placeholders.length).toBeGreaterThan(0);
      expect(l.nameTh).toBeTruthy();
      expect(l.nameEn).toBeTruthy();
    }
  });
});

describe('letterToHtml', () => {
  it('wraps the merged body into a self-contained HTML document with the title', () => {
    const tpl = getGeneratableLetter('employment-cert')!;
    const result = mergeLetter(tpl, empFull, 'th', baseOpts);
    const html = letterToHtml(result, 'th');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>หนังสือรับรองการทำงาน</title>');
    expect(html).toContain('สมชาย ใจดี');
    expect(html).toContain('lang="th"');
  });
});

describe('mockHireDate — deterministic, always a valid date (regression: signed-shift bug)', () => {
  // emp-003's id hashes above 2^31; a signed `>>` shift produced a negative
  // month/day and an invalid ISO ("2022--1-..") that rendered as "-".
  const ids = ['emp-003', 'emp-001', 'emp-007', 'emp-sf-42', 'CG-0425', 'x', 'zzzzzzzz', 'emp-999999'];
  it.each(ids)('produces a parseable YYYY-MM-DD with valid month/day for "%s"', (id) => {
    const d = mockHireDate({ id } as CnextEmployee);
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [y, m, day] = d.split('-').map(Number);
    expect(m).toBeGreaterThanOrEqual(1);
    expect(m).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(28);
    expect(y).toBeGreaterThanOrEqual(2014);
    expect(y).toBeLessThanOrEqual(2023);
    expect(Number.isNaN(new Date(d).getTime())).toBe(false);
  });
  it('is deterministic (same id → same date)', () => {
    expect(mockHireDate({ id: 'emp-003' } as CnextEmployee)).toBe(mockHireDate({ id: 'emp-003' } as CnextEmployee));
  });
});
