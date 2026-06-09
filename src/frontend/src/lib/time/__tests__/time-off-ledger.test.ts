import { describe, it, expect } from 'vitest';
import { TIME_OFF_LEDGER, endingBalance } from '../time-off-ledger';

describe('time-off-ledger', () => {
  it('Ending = Initial + Credits − Debits', () => {
    expect(endingBalance({ kind: 'x', nameTh: '', nameEn: '', initial: 10, credits: 2, debits: 3 })).toBe(9);
  });
  it('seeds the WFS leave buckets with non-negative endings', () => {
    expect(TIME_OFF_LEDGER.length).toBeGreaterThanOrEqual(4);
    expect(TIME_OFF_LEDGER.every((r) => endingBalance(r) >= 0)).toBe(true);
    expect(TIME_OFF_LEDGER.find((r) => r.kind === 'annual')!).toBeTruthy();
  });
});
