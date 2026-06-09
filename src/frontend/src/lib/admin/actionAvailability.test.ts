import { describe, it, expect } from 'vitest'
import { actionAvailability, type EmployeeStatusFacts } from './actionAvailability'

const INACTIVE_REASON = 'พนักงานไม่ได้ทำงานอยู่ — ต้องเปิดใช้งานก่อน'
const TERMINATED_REASON = 'พนักงานพ้นสภาพแล้ว — ใช้ "จ้างซ้ำ" ก่อน'

const active: EmployeeStatusFacts = {
  status: 'active',
  probation_status: 'passed',
  employee_class: 'PERMANENT',
}

const inactive: EmployeeStatusFacts = {
  status: 'inactive',
  probation_status: 'passed',
  employee_class: 'PERMANENT',
}

const terminated: EmployeeStatusFacts = {
  status: 'terminated',
  probation_status: 'terminated',
  employee_class: 'PERMANENT',
}

describe('actionAvailability — acting (STA-55)', () => {
  it('allows acting for an active employee', () => {
    expect(actionAvailability(active).acting.ok).toBe(true)
  })

  it('blocks acting for an inactive employee with the inactive reason', () => {
    const acting = actionAvailability(inactive).acting
    expect(acting.ok).toBe(false)
    expect(acting.reason).toBe(INACTIVE_REASON)
  })

  it('blocks acting for a terminated employee with the terminated reason', () => {
    const acting = actionAvailability(terminated).acting
    expect(acting.ok).toBe(false)
    expect(acting.reason).toBe(TERMINATED_REASON)
  })
})
