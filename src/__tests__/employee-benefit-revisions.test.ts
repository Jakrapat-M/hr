import { describe, it, expect } from 'vitest'
import {
  formatAdjustedAmount,
  toClaimEmployeeId,
  claimStatusRank,
  compareClaimHistory,
  sortClaimHistory,
} from '@/app/[locale]/admin/employees/[id]/page'
import type { BenefitClaimStatus } from '@/stores/benefit-claims'

const claim = (status: BenefitClaimStatus, submittedAt: string) => ({ status, submittedAt })

// STA-132 (Part 1.1) — adjusted-amount +/- formatter.
// NO-RED guardrail: positive = teal (`text-accent`), negative = neutral
// (`text-ink-muted`), and NEVER the danger token.
describe('formatAdjustedAmount', () => {
  it('formats a positive delta with a + prefix and teal class', () => {
    const out = formatAdjustedAmount(16000, 'THB')
    expect(out.text).toBe('+16,000 THB')
    expect(out.className).toBe('text-accent')
    expect(out.className).not.toContain('danger')
  })

  it('formats zero as plain ink (no sign)', () => {
    const out = formatAdjustedAmount(0, 'THB')
    expect(out.text).toBe('0 THB')
    expect(out.className).toBe('text-ink')
    expect(out.className).not.toContain('danger')
  })

  it('formats null as plain ink zero', () => {
    const out = formatAdjustedAmount(null, 'THB')
    expect(out.text).toBe('0 THB')
    expect(out.className).toBe('text-ink')
  })

  it('formats a negative delta with neutral ink-muted (never red/danger)', () => {
    const out = formatAdjustedAmount(-2000, 'THB')
    expect(out.text).toBe('-2,000 THB')
    expect(out.className).toBe('text-ink-muted')
    expect(out.className).not.toContain('danger')
    expect(out.className).not.toContain('red')
  })
})

// STA-132 (Part 5) — normalize the route id (EMP-0002) to the claim store key
// (EMP002), or the inline claim-history table renders empty.
describe('toClaimEmployeeId', () => {
  it('maps EMP-0002 → EMP002', () => {
    expect(toClaimEmployeeId('EMP-0002')).toBe('EMP002')
  })

  it('maps EMP-0001 → EMP001', () => {
    expect(toClaimEmployeeId('EMP-0001')).toBe('EMP001')
  })

  it('leaves an already-normalized id unchanged', () => {
    expect(toClaimEmployeeId('EMP002')).toBe('EMP002')
  })

  it('returns the input untouched when it does not match the EMP pattern', () => {
    expect(toClaimEmployeeId('XYZ-123')).toBe('XYZ-123')
  })
})

// STA-133 (Part 2) — claim-history sort: status group first, then newest→oldest.
// Status group order (top→bottom):
//   send_back ('ขอข้อมูลเพิ่ม') → pending_* ('รออนุมัติ') → approved ('อนุมัติแล้ว') → rest (rejected) last.
describe('claimStatusRank', () => {
  it('ranks send_back (need-more-info) first', () => {
    expect(claimStatusRank('send_back')).toBeLessThan(claimStatusRank('pending_manager_approval'))
    expect(claimStatusRank('send_back')).toBeLessThan(claimStatusRank('pending_spd'))
  })

  it('ranks both pending states as one middle group, ahead of approved', () => {
    expect(claimStatusRank('pending_manager_approval')).toBe(claimStatusRank('pending_spd'))
    expect(claimStatusRank('pending_spd')).toBeLessThan(claimStatusRank('approved'))
  })

  it('ranks rejected (and any other) last', () => {
    expect(claimStatusRank('rejected')).toBeGreaterThan(claimStatusRank('approved'))
  })
})

describe('compareClaimHistory', () => {
  it('orders by status group regardless of date', () => {
    const approvedNew = claim('approved', '2026-06-10T00:00:00.000Z')
    const sendBackOld = claim('send_back', '2026-01-01T00:00:00.000Z')
    // send_back outranks approved even though it is older.
    expect(compareClaimHistory(sendBackOld, approvedNew)).toBeLessThan(0)
  })

  it('within the same status group, sorts latest → earliest', () => {
    const older = claim('approved', '2026-03-01T00:00:00.000Z')
    const newer = claim('approved', '2026-05-01T00:00:00.000Z')
    expect(compareClaimHistory(newer, older)).toBeLessThan(0)
    expect(compareClaimHistory(older, newer)).toBeGreaterThan(0)
  })
})

describe('sortClaimHistory', () => {
  it('groups by status then orders newest→oldest within each group', () => {
    const input = [
      claim('approved', '2026-02-01T00:00:00.000Z'), // approved, oldest
      claim('pending_spd', '2026-04-01T00:00:00.000Z'),
      claim('send_back', '2026-01-15T00:00:00.000Z'), // need-more-info, older
      claim('approved', '2026-05-20T00:00:00.000Z'),
      claim('send_back', '2026-05-25T00:00:00.000Z'), // need-more-info, newest
      claim('pending_manager_approval', '2026-03-10T00:00:00.000Z'),
    ]
    const out = sortClaimHistory(input)
    // 1) newest send_back is the very first row.
    expect(out[0].status).toBe('send_back')
    expect(out[0].submittedAt).toBe('2026-05-25T00:00:00.000Z')
    // 2) the two send_back rows come first, newest before older.
    expect(out[1].status).toBe('send_back')
    expect(out[1].submittedAt).toBe('2026-01-15T00:00:00.000Z')
    // 3) then the two pending rows (newest first), then approved (newest first, oldest last).
    expect(out.map((c) => c.status)).toEqual([
      'send_back',
      'send_back',
      'pending_spd',
      'pending_manager_approval',
      'approved',
      'approved',
    ])
    // 4) the oldest approved is the very last row.
    expect(out[out.length - 1].submittedAt).toBe('2026-02-01T00:00:00.000Z')
  })

  it('places rejected last, stable', () => {
    const input = [
      claim('rejected', '2026-06-01T00:00:00.000Z'),
      claim('approved', '2026-01-01T00:00:00.000Z'),
    ]
    const out = sortClaimHistory(input)
    expect(out[0].status).toBe('approved')
    expect(out[1].status).toBe('rejected')
  })

  it('does not mutate the input array', () => {
    const input = [claim('approved', '2026-01-01T00:00:00.000Z'), claim('send_back', '2026-02-01T00:00:00.000Z')]
    const copy = [...input]
    sortClaimHistory(input)
    expect(input).toEqual(copy)
  })
})
