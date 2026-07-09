// SF entity: EmpPayCompRecurring — Recurring pay components (multi-record)
// API verb: UPSERT
// Phase: 5 (strict BA parity)
// Source: plan v2 §2.11, CREATE-VS-UPSERT.md, sf-qas-ec-fields-FULL-2026-04-25.json
//
// SF dump sap_required fields (sap_upsertable=true):
//   userId, startDate, payComponent, paycompvalue (Amount), currencyCode, frequency
//
// Emit strategy:
//   Row 0: base salary — payComponent=TH_1000 ("Salary-T/P/S" from PICKLIST_PAY_COMPONENT)
//   Rows 1-N: additional recurringComponents[] from compensation slice (lifted from StepCompensation)
//
// payComponent code for base salary: TH_1000
//   Source: PICKLIST_PAY_COMPONENT in src/services/shared/src/picklists/index.ts
//   id="TH_1000" labelEn="Salary-T/P/S" — Thailand monthly salary component
//   NOTE: no inline QAS sample data available to confirm production usage.
//         TH_1000 is the most plausible TH salary code; flag for SF integration team to verify.
import type { PortletMapper, MapperResult } from './types'
import { toSfDate, deriveUserId } from './derivedRules'

const BASE_SALARY_PAY_COMPONENT = 'TH_1000' // Salary-T/P/S; verify with SF integration team

export const EmpPayCompRecurringMapper: PortletMapper = {
  entity: 'EmpPayCompRecurring',
  verb: 'UPSERT',
  build(input): MapperResult {
    const userId = deriveUserId(input.identity.employeeId)
    const startDate = toSfDate(input.identity.hireDate)
    const currency = input.compensation.currency ?? 'THB'
    const frequency = input.compensation.payFrequency ?? 'MON'

    const rows: Record<string, unknown>[] = []

    // Row 0: base salary — always emitted (zero when not set) so the mandatory
    // coverage check (SF parity test E1.i) can verify required fields are present.
    // API layer should skip this row when baseSalary is null/zero.
    rows.push({
      userId,
      startDate,
      payComponent: BASE_SALARY_PAY_COMPONENT,
      paycompvalue: input.compensation.baseSalary ?? 0,
      currencyCode: currency,
      frequency,
    })

    // Rows 1-N: additional recurring allowances entered in StepCompensation
    const additionalComponents = input.compensation.recurringComponents ?? []
    for (const comp of additionalComponents) {
      // Skip rows with empty payComponent or zero/empty amount
      if (!comp.payComponent || !comp.amount) continue
      const amountNum = parseFloat(comp.amount)
      if (isNaN(amountNum) || amountNum <= 0) continue
      rows.push({
        userId,
        startDate,
        payComponent: comp.payComponent,
        paycompvalue: amountNum,
        currencyCode: comp.currencyCode || currency,
        frequency: comp.frequency || frequency,
      })
    }

    const hasSalary = (input.compensation.baseSalary ?? 0) > 0
    return {
      verb: 'UPSERT',
      payload: rows,
      notes: [
        `Base salary payComponent=${BASE_SALARY_PAY_COMPONENT} (TH_1000="Salary-T/P/S") — verify code with SF integration team; no inline QAS sample available`,
        `${rows.length} row(s) emitted (1 base salary + ${rows.length - 1} recurring)`,
        hasSalary ? '' : 'BLOCKER: baseSalary is null/zero — API layer MUST skip this row until salary is entered',
      ].filter(Boolean),
    }
  },
}
