// Phase 1.1 scaffold smoke test — verifies buildAll runs without throwing
// and returns 17 PENDING keys. Superseded by Phase 1.2 parity test framework.
import { describe, it, expect } from 'vitest'
import { buildAll, mappers } from '../index'
import type { FormData } from '../../../store/useHireWizard'

const minimalFormData: FormData = {
  identity: {
    hireDate: null, companyCode: null, eventReason: null,
    salutationEn: null, firstNameEn: '', middleNameEn: '', lastNameEn: '',
    dateOfBirth: null, countryOfBirth: null, regionOfBirth: '',
    age: null, employeeId: '', nationalIdCardType: null,
    country: null, nationalId: '', issueDate: null, expiryDate: null,
    isPrimary: null, vnIssuePlace: '', salutationLocal: null,
  },
  biographical: {
    otherTitleTh: '', firstNameLocal: '', lastNameLocal: '',
    middleNameLocal: '', nickname: '', militaryStatus: null,
    gender: null, nationality: null, foreigner: null,
    bloodType: null, maritalStatus: null, maritalStatusSince: null,
  },
  review: {
    salutationEnReview: null, firstNameEnReview: '',
    lastNameEnReview: '', middleNameEnReview: '', attachmentName: null,
  },
  contact: {
    phones: [{ type: 'mobile', value: '', isPrimary: true }],
    emails: [{ type: 'personal', value: '', isPrimary: true }],
    jobRelationships: [],
  },
  name: { firstNameTh: '', lastNameTh: '', firstNameEn: '', lastNameEn: '' },
  employeeInfo: {
    employeeClass: null,
    originalStartDate: '', seniorityStartDate: '', retirementDate: '',
    pfServiceDate: '', dvtPreviousId: '', cgPreviousEmployeeId: '',
  },
  nationalId: { value: '' },
  personal: { addressLine1: '' },
  job: {
    position: '', businessUnit: null, businessUnitLabel: null,
    branch: null, branchLabel: null, jobCode: null, jobLabel: null,
    jobGrade: null, jobGradeLabel: null, storeBranchCode: null, hrDistrict: null,
    workSchedule: '', holidayTypeCondition: '', timeManagementStatus: '',
    otFlag: '', standardWeeklyHours: 0, dailyWorkingHours: 0,
    workingDaysPerWeek: 0, fte: 0, holidayCalendar: '', timeProfile: '',
    timeRecordingVariant: '',
  },
  compensation: { baseSalary: null },
}

describe('sfMapper scaffold smoke', () => {
  it('buildAll returns 17 keys all PENDING with null payloads', () => {
    const result = buildAll(minimalFormData)
    const keys = Object.keys(result)
    expect(keys).toHaveLength(17)
    for (const key of keys) {
      expect(result[key as keyof typeof result].verb).toBe('PENDING')
      expect(result[key as keyof typeof result].payload).toBeNull()
    }
  })

  it('all mappers declare entity string and CREATE or UPSERT verb', () => {
    for (const [, mapper] of Object.entries(mappers)) {
      expect(typeof mapper.entity).toBe('string')
      expect(mapper.entity.length).toBeGreaterThan(0)
      expect(['CREATE', 'UPSERT']).toContain(mapper.verb)
    }
  })

  it('User mapper verb is CREATE (not UPSERT)', () => {
    expect(mappers.user.verb).toBe('CREATE')
  })
})
