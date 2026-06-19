import { describe, it, expect } from 'vitest';
import { formatDate, maskValue, formatCurrency, inactiveEndDate } from '../date';

// STA-132 — Inactive → effective end date = today − 1 (date-only, no tz drift).
describe('inactiveEndDate', () => {
  it('returns the day before "today" (19 Jun 2026 → 18 Jun 2026)', () => {
    expect(inactiveEndDate(new Date('2026-06-19T00:00:00Z'))).toBe('2026-06-18');
  });

  it('handles month/year boundary (1 Jan 2026 → 31 Dec 2025)', () => {
    expect(inactiveEndDate(new Date('2026-01-01T00:00:00Z'))).toBe('2025-12-31');
  });

  it('is timezone-stable for a late-evening local time', () => {
    expect(inactiveEndDate(new Date(2026, 5, 19, 23, 30))).toBe('2026-06-18');
  });
});

describe('formatDate', () => {
 it('formats date in English medium format', () => {
 expect(formatDate('2024-01-15','medium','en')).toBe('15 Jan 2024');
 });

 it('formats date in Thai medium format with Buddhist year', () => {
 expect(formatDate('2024-01-15','medium','th')).toBe('15 ม.ค. 2567');
 });

 it('formats date in long format', () => {
 expect(formatDate('2024-06-20','long','en')).toBe('20 June 2024');
 });

 it('formats date in Thai long format', () => {
 expect(formatDate('2024-06-20','long','th')).toBe('20 มิถุนายน 2567');
 });

 it('formats date in short format', () => {
 expect(formatDate('2024-01-05','short','en')).toBe('05/01/2024');
 });

 it('returns dash for null', () => {
 expect(formatDate(null)).toBe('-');
 });

 it('returns dash for invalid date', () => {
 expect(formatDate('invalid')).toBe('-');
 });
});

describe('maskValue', () => {
 it('masks all but last 4 characters', () => {
 expect(maskValue('1234567890')).toBe('••••••7890');
 });

 it('returns dash for null', () => {
 expect(maskValue(null)).toBe('-');
 });

 it('returns value if shorter than visible chars', () => {
 expect(maskValue('abc', 4)).toBe('abc');
 });
});

describe('formatCurrency', () => {
 it('formats THB currency', () => {
 const result = formatCurrency(120000);
 expect(result).toContain('120,000');
 });
});
