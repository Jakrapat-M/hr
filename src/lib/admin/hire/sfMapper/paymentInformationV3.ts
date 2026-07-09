// SF entity: PaymentInformationV3 — Bank/payment header (effective-dated)
// API verb: UPSERT
// Phase: 5 (strict BA parity)
// Source: plan v2 §2.12, CREATE-VS-UPSERT.md, sf-qas-ec-fields-FULL-2026-04-25.json
//
// SF structure (two-step UPSERT pattern):
//   Step 1 — PaymentInformationV3 (header): worker + effectiveStartDate
//   Step 2 — PaymentInformationDetailV3 (detail, separate UPSERT using nav keys):
//              PaymentInformationV3_worker + PaymentInformationV3_effectiveStartDate
//              + bankCountry, currency, paymentMethod, payType, bank, accountNumber,
//              businessIdentifierCode (BIC/SWIFT = "Bank Code" in BA spec)
//
// BA Required: bankCountry, currency (payType), paymentMethod
// Optional: bank, accountNumber, bankCode (businessIdentifierCode / BIC)
//
// Integration note: the detail payload is included in mapper.notes as 'detailPayload'
// key so the API layer can submit it as a second UPSERT to PaymentInformationDetailV3.
//
// NOTE on "bankCode" (BA label): mapped to businessIdentifierCode (BIC/SWIFT).
//   SF also has routingNumber (US/international routing). BA spec says "Bank Code" without
//   further qualification — BIC chosen as it is the more common international code for THA.
//   Flag for SF integration team if routingNumber is intended instead.
import type { PortletMapper, MapperResult } from './types'
import { toSfDate, deriveUserId } from './derivedRules'

export const PaymentInformationV3Mapper: PortletMapper = {
  entity: 'PaymentInformationV3',
  verb: 'UPSERT',
  build(input): MapperResult {
    const worker = deriveUserId(input.identity.employeeId)
    const effectiveStartDate = toSfDate(input.identity.hireDate)
    const comp = input.compensation

    // Build detail record for PaymentInformationDetailV3 (separate UPSERT)
    // Keys: PaymentInformationV3_worker + PaymentInformationV3_effectiveStartDate
    const detail: Record<string, unknown> = {
      PaymentInformationV3_worker: worker,
      PaymentInformationV3_effectiveStartDate: effectiveStartDate,
    }

    // BA Required fields
    if (comp.bankCountry)    detail.bankCountry = comp.bankCountry
    if (comp.currency)       detail.currency = comp.currency  // default 'THB' from StepCompensation
    if (comp.paymentMethod)  detail.paymentMethod = comp.paymentMethod
    if (comp.payType)        detail.payType = comp.payType

    // Optional fields
    if (comp.bank)           detail.bank = comp.bank
    if (comp.accountNumber)  detail.accountNumber = comp.accountNumber
    if (comp.bankCode)       detail.businessIdentifierCode = comp.bankCode  // BIC/SWIFT

    const notes: string[] = [
      'Two-step UPSERT: (1) PaymentInformationV3 header (worker+effectiveStartDate), ' +
        '(2) PaymentInformationDetailV3 detail (see detailPayload in mapper result)',
      '"bankCode" form field → businessIdentifierCode (BIC/SWIFT) — confirm with SF integration team if routingNumber intended',
      // Embed serialized detail payload for API layer consumption
      `detailPayload:${JSON.stringify(detail)}`,
    ]

    const missingRequired: string[] = []
    if (!comp.bankCountry)   missingRequired.push('bankCountry')
    if (!comp.paymentMethod) missingRequired.push('paymentMethod')
    if (!comp.payType)       missingRequired.push('payType')
    if (missingRequired.length > 0) {
      notes.push(`BA Required fields not set (StepCompensation not yet filled): ${missingRequired.join(', ')}`)
    }

    return {
      verb: 'UPSERT',
      payload: {
        worker,
        effectiveStartDate,
      },
      notes,
    }
  },
}
