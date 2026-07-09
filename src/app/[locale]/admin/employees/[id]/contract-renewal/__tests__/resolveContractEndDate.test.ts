import { describe, expect, it } from 'vitest'
import { addYears, resolveContractEndDate } from '../contract-renewal.helpers'
import { MOCK_EMPLOYEES, type MockEmployee } from '@/mocks/employees'

// Minimal MockEmployee factory — only the fields resolveContractEndDate reads
// plus enough to satisfy the type. Avoids coupling to the full seed shape.
function makeEmployee(overrides: Partial<MockEmployee>): MockEmployee {
  return {
    employee_id: 'EMP-TEST',
    first_name_th: 'ทดสอบ',
    last_name_th: 'ระบบ',
    first_name_en: 'Test',
    last_name_en: 'System',
    employee_class: 'PARTIME',
    date_of_birth: '1990-01-01',
    hire_date: '2023-01-01',
    original_start_date: '2023-01-01',
    seniority_start_date: '2023-01-01',
    company: 'CRC',
    position_title: 'Retail Associate',
    corporate_title: 'Retail Associate',
    org_unit: 'Retail - Rama 9',
    probation_status: 'passed',
    status: 'active',
    store_branch_code: null,
    hr_district: null,
    job_grade: 'JG-02',
    ...overrides,
  }
}

describe('resolveContractEndDate', () => {
  it('returns the stored contract_end_date when present (not hire_date + 1 year)', () => {
    const emp = makeEmployee({
      hire_date: '2023-01-01',
      contract_end_date: '2025-06-30',
    })
    expect(resolveContractEndDate(emp)).toBe('2025-06-30')
    expect(resolveContractEndDate(emp)).not.toBe(addYears('2023-01-01', 1))
  })

  it('falls back to hire_date + 1 year when contract_end_date is undefined', () => {
    const emp = makeEmployee({
      hire_date: '2023-01-01',
      contract_end_date: undefined,
    })
    expect(resolveContractEndDate(emp)).toBe('2024-01-01')
    expect(resolveContractEndDate(emp)).toBe(addYears('2023-01-01', 1))
  })

  it('mock seed assigns a contract_end_date to at least one PARTIME employee', () => {
    const seeded = MOCK_EMPLOYEES.find(
      (e) => e.regular_temporary === 'T' && !!e.contract_end_date,
    )
    expect(seeded).toBeDefined()
    // ISO YYYY-MM-DD shape guard
    expect(seeded?.contract_end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('leaves contract_end_date undefined for regular employees in the seed', () => {
    const regularWithContract = MOCK_EMPLOYEES.find(
      (e) => e.regular_temporary === 'R' && !!e.contract_end_date,
    )
    expect(regularWithContract).toBeUndefined()
  })
})
