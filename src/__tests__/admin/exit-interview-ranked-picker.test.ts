// exit-interview-ranked-picker.test.ts — STA-124 Exit Interview logic.
//
// Covers the testable core of the ranked-factor picker:
//   - dependent options: a factor chosen in one rank is removed from the other
//     two ranks WITHIN the same part
//   - intra-part uniqueness, and that the currently-selected value is retained
//   - same factor allowed across DIFFERENT parts (independent state)
//   - the optional-section emptiness check (form valid when blank)

import { describe, it, expect } from 'vitest'
import { availableOptions } from '@/components/admin/terminate/ExitInterviewSection'
import {
  JOB_FACTORS,
  COMPENSATION_FACTORS,
} from '@/lib/admin/exit-interview-options'
import {
  isExitInterviewEmpty,
  EMPTY_EXIT_INTERVIEW,
  EMPTY_RANKED_PART,
  type RankedExitPart,
  type ExitInterviewRecord,
} from '@/stores/exit-feedback'

function part(overrides: Partial<RankedExitPart>): RankedExitPart {
  return { ...EMPTY_RANKED_PART, ...overrides }
}

describe('availableOptions — dependent ranked picker', () => {
  it('removes a rank-1 choice from rank-2 and rank-3 lists', () => {
    const p = part({ rank1: 'job_overload' })
    const codes2 = availableOptions(JOB_FACTORS, p, 'rank2').map((o) => o.code)
    const codes3 = availableOptions(JOB_FACTORS, p, 'rank3').map((o) => o.code)
    expect(codes2).not.toContain('job_overload')
    expect(codes3).not.toContain('job_overload')
  })

  it('keeps the slot\'s own current value in its own option list', () => {
    const p = part({ rank1: 'job_overload', rank2: 'job_no_progress' })
    const codes1 = availableOptions(JOB_FACTORS, p, 'rank1').map((o) => o.code)
    expect(codes1).toContain('job_overload') // own value retained
    expect(codes1).not.toContain('job_no_progress') // taken by rank2
  })

  it('removes all already-chosen factors from a still-empty rank', () => {
    const p = part({ rank1: 'job_overload', rank2: 'job_relocated' })
    const codes3 = availableOptions(JOB_FACTORS, p, 'rank3').map((o) => o.code)
    expect(codes3).not.toContain('job_overload')
    expect(codes3).not.toContain('job_relocated')
    expect(codes3.length).toBe(JOB_FACTORS.length - 2)
  })

  it('enforces intra-part uniqueness only — same code allowed across parts', () => {
    // Job part has rank1 = job_overload; the Compensation part is independent.
    const compPart = part({ rank1: 'comp_low_income' })
    const compCodes2 = availableOptions(COMPENSATION_FACTORS, compPart, 'rank2').map((o) => o.code)
    // Compensation list is unaffected by the Job selection (different option set).
    expect(compCodes2).not.toContain('comp_low_income')
    expect(compCodes2).toContain('comp_low_bonus')
  })
})

describe('isExitInterviewEmpty — optional section', () => {
  it('returns true for a pristine record (form valid when blank)', () => {
    expect(isExitInterviewEmpty(EMPTY_EXIT_INTERVIEW)).toBe(true)
  })

  it('returns false once any ranked factor is chosen', () => {
    const r: ExitInterviewRecord = {
      ...EMPTY_EXIT_INTERVIEW,
      job: part({ rank1: 'job_overload' }),
    }
    expect(isExitInterviewEmpty(r)).toBe(false)
  })

  it('returns false once a single-select (Part 4) is chosen', () => {
    const r: ExitInterviewRecord = {
      ...EMPTY_EXIT_INTERVIEW,
      personalReason: { value: 'personal_study' },
    }
    expect(isExitInterviewEmpty(r)).toBe(false)
  })

  it('returns false once only the overall comment is filled', () => {
    const r: ExitInterviewRecord = {
      ...EMPTY_EXIT_INTERVIEW,
      overallComment: 'Thanks for everything.',
    }
    expect(isExitInterviewEmpty(r)).toBe(false)
  })

  it('treats whitespace-only comments as empty', () => {
    const r: ExitInterviewRecord = {
      ...EMPTY_EXIT_INTERVIEW,
      overallComment: '   ',
      job: part({ comment: '  ' }),
    }
    expect(isExitInterviewEmpty(r)).toBe(true)
  })
})
