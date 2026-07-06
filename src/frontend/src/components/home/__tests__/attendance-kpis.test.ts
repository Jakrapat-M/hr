// STA-235 — the relocated attendance KPI aggregation (pure, seed-derived).
import { describe, it, expect } from 'vitest';
import { computeAttendanceKpis } from '../AttendanceKpiCards';
import { DEMO_TODAY } from '@/lib/time/period';

describe('computeAttendanceKpis', () => {
  it('aggregates on-time / late / absent over a cohort and derives a bounded rate', () => {
    const k = computeAttendanceKpis(['EMP-0301', 'EMP-0009'], DEMO_TODAY);
    expect(k.scheduledDays).toBeGreaterThan(0);
    expect(k.onTime + k.late + k.mismatch + k.absent).toBe(k.scheduledDays);
    expect(k.onTimeRatePct).toBeGreaterThanOrEqual(0);
    expect(k.onTimeRatePct).toBeLessThanOrEqual(100);
  });

  it('empty cohort → zeroed KPIs (no divide-by-zero)', () => {
    const k = computeAttendanceKpis([], DEMO_TODAY);
    expect(k).toEqual({ onTime: 0, late: 0, mismatch: 0, absent: 0, scheduledDays: 0, onTimeRatePct: 0 });
  });
});
