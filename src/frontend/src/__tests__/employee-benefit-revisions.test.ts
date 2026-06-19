import { describe, it, expect } from 'vitest'
import {
  formatAdjustedAmount,
  toClaimEmployeeId,
} from '@/app/[locale]/admin/employees/[id]/page'

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
