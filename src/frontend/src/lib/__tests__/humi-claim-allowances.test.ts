import { describe, expect, it } from 'vitest';
import { HUMI_CLAIM_ALLOWANCES } from '@/lib/humi-mock-data';

// STA-196 — the "วงเงินตามประเภท" section renders one box per allowance entry.
describe('HUMI_CLAIM_ALLOWANCES (STA-196)', () => {
  it('holds exactly 8 entries (one box per benefit)', () => {
    expect(HUMI_CLAIM_ALLOWANCES).toHaveLength(8);
  });

  it('keeps the 4 legacy ids first and unchanged', () => {
    expect(HUMI_CLAIM_ALLOWANCES.slice(0, 4).map((a) => a.id)).toEqual([
      'ca-medical',
      'ca-dental',
      'ca-phone',
      'ca-fuel',
    ]);
  });

  it('carries the remaining note ONLY on the medical box', () => {
    const withNote = HUMI_CLAIM_ALLOWANCES.filter((a) => a.remainingNoteTh);
    expect(withNote.map((a) => a.id)).toEqual(['ca-medical']);

    const medical = HUMI_CLAIM_ALLOWANCES.find((a) => a.id === 'ca-medical');
    expect(medical?.remainingNoteTh).toBe('ยอดคงเหลือยังไม่รวมใบส่งตัว 2 เดือนล่าสุด');
    expect(medical?.remainingNoteEn).toBe(
      'Remaining balance excludes referral letters from the last 2 months',
    );

    for (const a of HUMI_CLAIM_ALLOWANCES) {
      if (a.id === 'ca-medical') continue;
      expect(a.remainingNoteTh).toBeUndefined();
      expect(a.remainingNoteEn).toBeUndefined();
    }
  });
});
