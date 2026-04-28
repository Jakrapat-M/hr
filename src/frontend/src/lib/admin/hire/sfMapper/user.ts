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

    const notes: string[] = [
      'cust_religion/cust_disability deferred to Phase 5b-2 (Global Information)',
    ]
    if (!cust_workingLocation) {
      notes.push('cust_workingLocation is empty — Phase 3 wires the full 1196-option picklist (cust_WorkLocation)')
    }

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
        cust_religion: null,
        cust_disability: null,
        nickname: input.biographical.nickname || '',
        nicknamelocal: input.biographical.nickname || '',
      },
      notes,
    }
  },
}
