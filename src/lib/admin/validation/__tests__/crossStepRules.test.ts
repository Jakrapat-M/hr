// crossStepRules.test.ts — STA-82 A5 Vitest coverage.
import { describe, it, expect } from 'vitest'
import {
  probationEndAfterHire,
  transferOutAfterJobStart,
  crossStepRulesFor,
  passesAllCrossStepRules,
  collectCrossStepFailures,
} from '../crossStepRules'

describe('crossStepRules — probationEndAfterHire', () => {
  it('returns true when either date is blank (individual required checks own that)', () => {
    expect(probationEndAfterHire({})).toBe(true)
    expect(probationEndAfterHire({ identity: { hireDate: '2026-01-01' } })).toBe(true)
    expect(probationEndAfterHire({ job: { probationEnd: '2026-04-01' } })).toBe(true)
  })

  it('passes when probationEnd is strictly after hireDate', () => {
    expect(
      probationEndAfterHire({
        identity: { hireDate: '2026-01-01' },
        job: { probationEnd: '2026-04-01' },
      }),
    ).toBe(true)
  })

  it('fails when probationEnd <= hireDate and surfaces inline TH (EN) literal', () => {
    const result = probationEndAfterHire({
      identity: { hireDate: '2026-04-01' },
      job: { probationEnd: '2026-04-01' },
    })
    expect(result).not.toBe(true)
    if (result === true) return
    expect(result.path).toEqual(['job', 'probationEnd'])
    expect(result.message).toBe(
      'วันสิ้นสุดทดลองงานต้องหลังวันที่จ้าง (Probation end must be after hire date)',
    )
    expect(result.message).not.toContain('hireForm.')
  })
})

describe('crossStepRules — transferOutAfterJobStart', () => {
  it('returns true when either date is blank', () => {
    expect(transferOutAfterJobStart({})).toBe(true)
    expect(transferOutAfterJobStart({ job: { jobStartDate: '2026-01-01' } })).toBe(true)
    expect(transferOutAfterJobStart({ job: { transferOutDate: '2026-04-01' } })).toBe(true)
  })

  it('passes when transferOutDate is strictly after jobStartDate', () => {
    expect(
      transferOutAfterJobStart({
        job: { jobStartDate: '2026-01-01', transferOutDate: '2026-06-01' },
      }),
    ).toBe(true)
  })

  it('fails when transferOutDate <= jobStartDate and surfaces inline TH (EN) literal', () => {
    const result = transferOutAfterJobStart({
      job: { jobStartDate: '2026-06-01', transferOutDate: '2026-06-01' },
    })
    expect(result).not.toBe(true)
    if (result === true) return
    expect(result.path).toEqual(['job', 'transferOutDate'])
    expect(result.message).toBe(
      'วันโอนย้ายต้องหลังวันเริ่มงาน (Transfer-out date must be after job start)',
    )
  })
})

describe('crossStepRules — crossStepRulesFor dispatch', () => {
  it('returns [] for step 1 (Identity / Who)', () => {
    expect(crossStepRulesFor(1)).toHaveLength(0)
  })

  it('returns both rules for step 2 (Job)', () => {
    const rules = crossStepRulesFor(2)
    expect(rules).toHaveLength(2)
    expect(rules).toContain(probationEndAfterHire)
    expect(rules).toContain(transferOutAfterJobStart)
  })

  it('returns both rules for step 3 (Review) — ADR-4 submit-gate', () => {
    const rules = crossStepRulesFor(3)
    expect(rules).toHaveLength(2)
    expect(rules).toContain(probationEndAfterHire)
    expect(rules).toContain(transferOutAfterJobStart)
  })

  it('returns [] for any step number < 2', () => {
    expect(crossStepRulesFor(0)).toHaveLength(0)
    expect(crossStepRulesFor(-1)).toHaveLength(0)
  })
})

describe('crossStepRules — passesAllCrossStepRules', () => {
  it('returns true on step 1 regardless of data (no rules to run)', () => {
    expect(passesAllCrossStepRules(1, {})).toBe(true)
    expect(
      passesAllCrossStepRules(1, {
        identity: { hireDate: '2026-04-01' },
        job: { probationEnd: '2026-04-01' },
      }),
    ).toBe(true)
  })

  it('returns false on step 2 when probation gate fails', () => {
    expect(
      passesAllCrossStepRules(2, {
        identity: { hireDate: '2026-04-01' },
        job: { probationEnd: '2026-04-01' },
      }),
    ).toBe(false)
  })

  it('returns false on step 3 (Review) when probation gate fails — Submit should be blocked', () => {
    expect(
      passesAllCrossStepRules(3, {
        identity: { hireDate: '2026-04-01' },
        job: { probationEnd: '2026-04-01' },
      }),
    ).toBe(false)
  })

  it('returns true on step 2 with valid data', () => {
    expect(
      passesAllCrossStepRules(2, {
        identity: { hireDate: '2026-01-01' },
        job: {
          probationEnd: '2026-04-01',
          jobStartDate: '2026-01-15',
          transferOutDate: '2026-06-01',
        },
      }),
    ).toBe(true)
  })
})

describe('crossStepRules — collectCrossStepFailures', () => {
  it('returns empty array when all rules pass', () => {
    expect(collectCrossStepFailures(2, {})).toEqual([])
  })

  it('returns every failing rule for the step', () => {
    const failures = collectCrossStepFailures(2, {
      identity: { hireDate: '2026-04-01' },
      job: {
        probationEnd: '2026-04-01',
        jobStartDate: '2026-06-01',
        transferOutDate: '2026-06-01',
      },
    })
    expect(failures).toHaveLength(2)
    expect(failures.map((f) => f.message)).toEqual([
      'วันสิ้นสุดทดลองงานต้องหลังวันที่จ้าง (Probation end must be after hire date)',
      'วันโอนย้ายต้องหลังวันเริ่มงาน (Transfer-out date must be after job start)',
    ])
  })

  it('honours Step-3 submit-gate (ADR-4): same failures on step 3', () => {
    const failures = collectCrossStepFailures(3, {
      identity: { hireDate: '2026-04-01' },
      job: { probationEnd: '2026-04-01' },
    })
    expect(failures).toHaveLength(1)
    expect(failures[0].path).toEqual(['job', 'probationEnd'])
  })
})
