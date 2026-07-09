// SF entity: PerGlobalInfoTHA — Thailand-specific global info
// API verb: UPSERT
// Phase: 5b-2 (strict BA parity — errata round 3)
// Source: sf-qas-ec-fields-FULL-2026-04-25.json § PerGlobalInfoTHA
//
// SF dump field verification (all sap_upsertable=true):
//   genericNumber2  — Number of Children (Edm.Int64, visible)
//   genericString5  — Religion (Edm.String, visible) — ALSO denormalized to User.cust_religion in Phase 5
//   customString1   — Disability Status (Edm.String maxLength=256, visible)
//   customDate1     — Disability Certificate Start Date (Edm.DateTime, visible)
//   customDate2     — Disability Certificate End Date (Edm.DateTime, visible)
//   genericString2  — Type of Disability (Edm.String, visible)
//   genericString4  — Certificate ID (Edm.String, visible)
//   genericNumber4  — Spouse's Father ID Number (Edm.Int64, visible) — stored as string (13-digit ID)
//   genericNumber5  — Spouse's Mother ID Number (Edm.Int64, visible) — stored as string (13-digit ID)
//   customString2   — Additional Information (Edm.String maxLength=256, visible)
//
// Keys: country + personIdExternal + startDate
import type { PortletMapper, MapperResult } from './types'
import { toSfDate } from './derivedRules'

interface PerGlobalInfoTHAPayload extends Record<string, unknown> {
  personIdExternal: string
  startDate: string
  country: string  // always 'THA'
  genericNumber2?: number | null     // Number of children
  genericString5?: string | null     // Religion — also denormalized to User.cust_religion via Phase 5
  customString1?: string             // Disability Status
  customDate1?: string | null        // Disability Cert Start Date
  customDate2?: string | null        // Disability Cert End Date
  genericString2?: string            // Type of Disability
  genericString4?: string            // Certificate ID
  genericNumber4?: string            // Spouse's Father ID Number (string at OData level — 13-digit)
  genericNumber5?: string            // Spouse's Mother ID Number
  customString2?: string             // Additional Information
}

export const PerGlobalInfoTHAMapper: PortletMapper<PerGlobalInfoTHAPayload> = {
  entity: 'PerGlobalInfoTHA',
  verb: 'UPSERT',
  build(input): MapperResult<PerGlobalInfoTHAPayload> {
    const personIdExternal = (input.identity?.employeeId ?? '').trim()
    const startDate = toSfDate(input.identity?.hireDate) ?? ''
    const gi = input.globalInfo

    const payload: PerGlobalInfoTHAPayload = {
      personIdExternal,
      startDate,
      country: 'THA',
    }

    // Only include optional fields when non-empty / non-null (omit undefined from payload)
    if (gi.numberOfChildren !== null && gi.numberOfChildren !== undefined) {
      payload.genericNumber2 = gi.numberOfChildren
    }
    if (gi.religion !== null && gi.religion !== undefined) {
      payload.genericString5 = gi.religion
    }
    if (gi.disabilityStatus) {
      payload.customString1 = gi.disabilityStatus
    }
    if (gi.disabilityCertStartDate) {
      payload.customDate1 = toSfDate(gi.disabilityCertStartDate)
    }
    if (gi.disabilityCertEndDate) {
      payload.customDate2 = toSfDate(gi.disabilityCertEndDate)
    }
    if (gi.typeOfDisability) {
      payload.genericString2 = gi.typeOfDisability
    }
    if (gi.certificateId) {
      payload.genericString4 = gi.certificateId
    }
    if (gi.spouseFatherIdNumber) {
      payload.genericNumber4 = gi.spouseFatherIdNumber
    }
    if (gi.spouseMotherIdNumber) {
      payload.genericNumber5 = gi.spouseMotherIdNumber
    }
    if (gi.additionalInformation) {
      payload.customString2 = gi.additionalInformation
    }

    return {
      verb: 'UPSERT',
      payload,
      notes: ['Religion also denormalized to User.cust_religion in Phase 5'],
    }
  },
}
