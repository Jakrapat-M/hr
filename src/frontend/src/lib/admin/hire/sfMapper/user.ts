// SF entity: User — SF user account (CREATE on hire)
// API verb: CREATE
// Phase: 1.3 (real implementation)
// Source: plan v2 §2.14, errata round 3, CREATE-VS-UPSERT.md
import type { PortletMapper, MapperResult } from './types'
import { deriveUserId, deriveUsername, toSfDate } from './derivedRules'

export const UserMapper: PortletMapper = {
  entity: 'User',
  verb: 'CREATE',
  build(input): MapperResult {
    const userId = deriveUserId(input.identity.employeeId)
    const primaryEmail = input.contact.emails.find(e => e.isPrimary)?.value
    const username = deriveUsername(primaryEmail, userId)
    const cust_workingLocation = input.job.storeBranchCode ?? input.job.branch ?? ''

    // Phase 5: denormalize from globalInfo slice (now populated by StepGlobalInfo / Phase 5b-2)
    // religion: globalInfo.religion → User.cust_religion (picklist RELIGION_THA)
    //   normalize empty-string → null so SF picklist doesn't receive an empty string
    const cust_religion = input.globalInfo?.religion || null
    // disabilityStatus: globalInfo.disabilityStatus → User.cust_disability
    //   normalize empty-string → null (SF picklist)
    const cust_disability = input.globalInfo?.disabilityStatus || null

    const notes: string[] = []
    if (!cust_workingLocation) {
      notes.push('cust_workingLocation is empty — Phase 3 wires the full 1196-option picklist (cust_WorkLocation)')
    }
    if (!cust_religion) notes.push('cust_religion: null (globalInfo.religion not set — optional)')
    if (!cust_disability) notes.push('cust_disability: null (globalInfo.disabilityStatus not set — optional)')

    return {
      verb: 'CREATE',
      payload: {
        userId,
        cust_firstNameTH: input.biographical.firstNameLocal,
        cust_lastNameTH: input.biographical.lastNameLocal,
        cust_prefixTH: input.identity.salutationLocal,
        cust_workingLocation,
        status: 't',
        username,
        defaultLocale: 'th_TH',
        timeZone: 'Asia/Bangkok',
        loginMethod: 'PWD',
        hireDate: toSfDate(input.identity.hireDate),
        // Phase 5: denormalized from globalInfo slice (errata round 3 §2.12)
        cust_religion,
        cust_disability,
        nickname: input.biographical.nickname || '',
        nicknamelocal: input.biographical.nickname || '',
        // Phase 4: User.ssn (sap_label="National ID", sap_creatable=true) — Thai SSN 13 digits
        ssn: input.employeeInfo.ssn || null,
      },
      notes,
    }
  },
}
