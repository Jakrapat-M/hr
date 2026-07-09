import { describe, it, expect } from 'vitest'
import {
  TERMINATION_LOGIC,
  TERMINATION_LOGIC_CODES,
  TRANSFER_OUT_COMPANIES,
  TRANSFER_OUT_REASON_CODE,
  computeTerminationDate,
} from './termination-logic'

describe('termination-logic registry', () => {
  it('has exactly 13 reason entries', () => {
    expect(TERMINATION_LOGIC_CODES).toHaveLength(13)
    expect(Object.keys(TERMINATION_LOGIC)).toHaveLength(13)
  })

  it('every entry default is its first sub-reason option', () => {
    for (const code of TERMINATION_LOGIC_CODES) {
      const entry = TERMINATION_LOGIC[code]
      expect(entry.reasonForTermination.options.length).toBeGreaterThan(0)
      expect(entry.reasonForTermination.default).toBe(
        entry.reasonForTermination.options[0].code,
      )
      expect(entry.transferOutDefault).toBe('NONE')
    }
  })

  it('TERM_RESIGN: voluntary, 4 RESIGN_* sub-codes, okToRehire default Yes', () => {
    const e = TERMINATION_LOGIC.TERM_RESIGN
    expect(e.voluntary).toBe(true)
    expect(e.okToRehireDefault).toBe(true)
    expect(e.reasonForTermination.options.map((o) => o.code)).toEqual([
      'RESIGN_PERSONAL',
      'RESIGN_STUDY',
      'RESIGN_FAMILY',
      'RESIGN_OTHER',
    ])
    expect(e.reasonForTermination.default).toBe('RESIGN_PERSONAL')
  })

  it('TERM_DISMISS: involuntary, 2 sub-reasons, okToRehire default No', () => {
    const e = TERMINATION_LOGIC.TERM_DISMISS
    expect(e.voluntary).toBe(false)
    expect(e.okToRehireDefault).toBe(false)
    expect(e.reasonForTermination.options).toHaveLength(2)
    expect(e.reasonForTermination.default).toBe('Dishonesty')
  })

  it('Transfer Out uses the CDS/CMG/RIS company list', () => {
    expect(TRANSFER_OUT_REASON_CODE).toBe('TERM_TRANS')
    expect(TRANSFER_OUT_COMPANIES.map((c) => c.code)).toEqual(['CDS', 'CMG', 'RIS'])
  })

  it('TERM_PASSAWAY visibility is SPD-only', () => {
    const v = TERMINATION_LOGIC.TERM_PASSAWAY.visibility
    expect(v).toEqual({ ess: false, manager: false, hrbp: false, spd: true })
  })
})

describe('computeTerminationDate', () => {
  it('returns resigned date + 1 day', () => {
    expect(computeTerminationDate('2026-06-09')).toBe('2026-06-10')
  })

  it('rolls over month boundaries', () => {
    expect(computeTerminationDate('2026-06-30')).toBe('2026-07-01')
  })

  it('rolls over year boundaries', () => {
    expect(computeTerminationDate('2026-12-31')).toBe('2027-01-01')
  })
})
