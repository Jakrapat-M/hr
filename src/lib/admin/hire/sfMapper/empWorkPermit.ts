// SF entity: EmpWorkPermit — Work permit (foreigners only)
// API verb: UPSERT
// Phase: 5b-3 (strict BA parity — Phase 5b-3)
// Source: plan v2 errata round 3
// Conditional: only emit payload when nationality !== TH (foreigner)
// SF sap_required fields: userId, documentType, country, documentNumber, issueDate
// customDate1 = Arrival date (VISA), customDate2 = 90-day report (VISA)
import type { PortletMapper } from './types'
import { toSfDate, deriveUserId } from './derivedRules'

export const EmpWorkPermitMapper: PortletMapper = {
  entity: 'EmpWorkPermit',
  verb: 'UPSERT',
  build(input) {
    const userId = deriveUserId(input.identity.employeeId)
    const wp = input.workPermit
    // Foreigner check: nationality ISO2 'TH' or ISO3 'THA' → Thai national, skip
    const nat = (input.biographical.nationality ?? '').toUpperCase()
    const isForeigner = nat !== '' && nat !== 'TH' && nat !== 'THA'

    if (!isForeigner || !wp.documentType || !wp.country || !wp.documentNumber || !wp.issueDate) {
      return {
        verb: 'UPSERT',
        payload: null,
        notes: [
          'Conditional: skipped — not a foreigner or required fields missing',
          'Required fields: documentType, country, documentNumber, issueDate',
          'Trigger: biographical.nationality must be non-TH foreigner',
        ],
      }
    }

    const payload: Record<string, unknown> = {
      userId,
      documentType: wp.documentType,
      country: wp.country,
      documentNumber: wp.documentNumber,
      issueDate: toSfDate(wp.issueDate) ?? '',
    }

    // Optional fields
    const expirationDate = toSfDate(wp.expiryDate)
    if (expirationDate) payload.expirationDate = expirationDate

    const customDate1 = toSfDate(wp.arrivalDateVisa)
    if (customDate1) payload.customDate1 = customDate1  // Arrival date (VISA)

    const customDate2 = toSfDate(wp.ninetyDayReportVisa)
    if (customDate2) payload.customDate2 = customDate2  // 90-day report (VISA)

    // attachment: separate upload flow — filename tracked in UI only (not in SF payload)

    return {
      verb: 'UPSERT',
      payload,
      notes: [
        'Conditional: foreigners only (nationality !== TH/THA)',
        'customDate1 = Arrival date (VISA), customDate2 = 90-day report (VISA)',
        'Attachment filename tracked in formData.workPermit.attachmentName — actual file upload is a separate flow',
      ],
    }
  },
}
