import { describe, expect, it } from 'vitest'
import { WORK_LOCATION_CODES } from '../workLocation'

describe('WORK_LOCATION_CODES', () => {
  it('exports unique codes so datalist option keys remain stable', () => {
    const uniqueCodes = new Set(WORK_LOCATION_CODES)

    expect(WORK_LOCATION_CODES).toContain('50001124')
    expect(WORK_LOCATION_CODES).toHaveLength(uniqueCodes.size)
  })
})
