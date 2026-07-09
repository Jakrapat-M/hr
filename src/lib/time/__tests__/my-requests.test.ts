import { describe, it, expect } from 'vitest';
import { isCancellableByCycle, demoToday } from '@/lib/time/period';
import { buildMyRequests } from '@/lib/time/my-requests';
import type { LeaveRequest } from '@/stores/leave-approvals';
import type { OTRequest } from '@/stores/overtime-requests';
import type { TimeCorrectionRequest } from '@/stores/time-corrections';

// demoToday() = 2026-06-07 → current cycle [2026-05-21 … 06-20], previous cycle
// starts 2026-04-21. isCancellableByCycle is true iff start >= 2026-04-21.
const REF = demoToday();

describe('isCancellableByCycle — cycle-window boundaries', () => {
  it.each([
    ['2026-04-20', false], // day before the previous cycle start
    ['2026-04-21', true], // previous cycle start (inclusive)
    ['2026-05-20', true], // last day of previous cycle
    ['2026-05-21', true], // current cycle start
    ['2026-06-01', true], // mid current cycle
    ['2026-01-01', false], // long before → not cancellable
    ['', false], // empty date → never cancellable
  ] as const)('start %s → %s', (date, expected) => {
    expect(isCancellableByCycle(date, REF)).toBe(expected);
  });
});

function leave(partial: Partial<LeaveRequest>): LeaveRequest {
  return {
    id: 'LV-1',
    employeeId: 'EMP001',
    employeeName: 'A',
    leaveType: 'annual_leave',
    leaveCode: 'annual_leave',
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    reason: 'r',
    status: 'pending',
    submittedAt: '2026-06-01T08:00:00Z',
    audit: [],
    ...partial,
  } as LeaveRequest;
}
function ot(partial: Partial<OTRequest>): OTRequest {
  return {
    id: 'OT-1',
    employeeId: 'EMP001',
    employeeName: 'A',
    department: 'Store',
    otType: 'OT',
    startAt: '2026-06-01T18:00:00',
    endAt: '2026-06-01T21:00:00',
    hours: 3,
    reason: 'r',
    docs: [],
    status: 'pending',
    submittedAt: '2026-06-02T08:00:00Z',
    audit: [],
    ...partial,
  } as OTRequest;
}
function tc(partial: Partial<TimeCorrectionRequest>): TimeCorrectionRequest {
  return {
    id: 'TC-1',
    employeeId: 'EMP001',
    employeeName: 'A',
    department: 'Store',
    date: '2026-06-01',
    correctionType: 'in',
    reasonCode: 'MACHINE_BROKE',
    payCode: 'MACHINE_BROKE',
    correctedTime: '08:00',
    reason: 'r',
    status: 'pending_manager',
    submittedAt: '2026-06-03T08:00:00Z',
    audit: [],
    ...partial,
  } as TimeCorrectionRequest;
}

describe('buildMyRequests — strict owner-filter, no fallback-to-others leak', () => {
  it('drops every row that does not belong to the employee', () => {
    const rows = buildMyRequests(
      'EMP001',
      {
        leave: [leave({ id: 'MINE' }), leave({ id: 'OTHER', employeeId: 'EMP999' })],
        ot: [ot({ id: 'OT-OTHER', employeeId: 'EMP999' })],
        tc: [tc({ id: 'TC-OTHER', employeeId: 'EMP999' })],
      },
      REF,
    );
    expect(rows.map((r) => r.id)).toEqual(['MINE']);
  });

  it('returns an empty list (never other employees) when the employee has none', () => {
    const rows = buildMyRequests(
      'EMP001',
      { leave: [leave({ employeeId: 'X' })], ot: [ot({ employeeId: 'X' })], tc: [tc({ employeeId: 'X' })] },
      REF,
    );
    expect(rows).toHaveLength(0);
  });
});

describe('buildMyRequests — mapping + eligibility', () => {
  it('normalizes TC pending_manager → pending', () => {
    const rows = buildMyRequests('EMP001', { leave: [], ot: [], tc: [tc({})] }, REF);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].type).toBe('time_correction');
  });

  it('cancellable follows status + cycle; rejected/cancelled always false', () => {
    const rows = buildMyRequests(
      'EMP001',
      {
        leave: [
          leave({ id: 'L-PEND', status: 'pending', startDate: '2026-06-01' }),
          leave({ id: 'L-APPR', status: 'approved', startDate: '2026-06-01' }),
          leave({ id: 'L-OLD', status: 'pending', startDate: '2026-01-01' }),
          leave({ id: 'L-REJ', status: 'rejected', startDate: '2026-06-01' }),
          leave({ id: 'L-CAN', status: 'cancelled', startDate: '2026-06-01' }),
        ],
        ot: [ot({ id: 'O-PREV', status: 'approved', startAt: '2026-05-01T18:00:00' })],
        tc: [tc({ id: 'T-CAN', status: 'cancelled', date: '2026-06-01' })],
      },
      REF,
    );
    const by = Object.fromEntries(rows.map((r) => [r.id, r.cancellable]));
    expect(by['L-PEND']).toBe(true);
    expect(by['L-APPR']).toBe(true); // approved in-cycle → cancellable
    expect(by['L-OLD']).toBe(false); // out of cycle
    expect(by['L-REJ']).toBe(false);
    expect(by['L-CAN']).toBe(false);
    expect(by['O-PREV']).toBe(true); // approved OT in the previous cycle → cancellable
    expect(by['T-CAN']).toBe(false);
  });

  it('sorts by submittedDate descending', () => {
    const rows = buildMyRequests(
      'EMP001',
      {
        leave: [leave({ id: 'OLDEST', submittedAt: '2026-06-01T00:00:00Z' })],
        ot: [ot({ id: 'NEWEST', submittedAt: '2026-06-05T00:00:00Z' })],
        tc: [tc({ id: 'MID', submittedAt: '2026-06-03T00:00:00Z' })],
      },
      REF,
    );
    expect(rows.map((r) => r.id)).toEqual(['NEWEST', 'MID', 'OLDEST']);
  });

  it('narrates the leave awaitingNext stage in the bilingual status label', () => {
    const rows = buildMyRequests(
      'EMP001',
      { leave: [leave({ status: 'pending', awaitingNext: true })], ot: [], tc: [] },
      REF,
    );
    expect(rows[0].statusLabel.en).toContain('HR');
    expect(rows[0].statusLabel.th).toContain('ฝ่ายบุคคล');
  });
});
