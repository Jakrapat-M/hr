// crossStepRules.ts — STA-82 A5 cross-step Zod-flavor validation rules.
//
// Why: some BA validation rules span TWO step schemas (e.g. job.probationEnd vs
// identity.hireDate). Putting them inside a single step's .superRefine would
// either dispatch on the wrong slice or duplicate state. Instead they live
// here and are composed into checkStepValid (useHireWizard.ts:~713) AFTER the
// per-slice sliceValid map has passed — boolean AND combination.
//
// Each rule receives the full HireFormData and returns either `true` (pass)
// or an object { path, message } describing where to surface the error.
// Messages are inline 'TH (EN)' literals per Principle 7 / ADR-4 — no i18n
// keys, matching the 6 existing precedents in hireSchema.ts.

export interface CrossStepRuleFailure {
  path: ReadonlyArray<string | number>
  message: string
}

export type CrossStepRuleResult = true | CrossStepRuleFailure

// Permissive structural type — we only read a small set of paths. Keeping
// this loose avoids a hard dependency on the store's evolving HireFormData
// shape (which the A4 V2 work tightens up).
export interface CrossStepRuleInput {
  identity?: {
    hireDate?: string
  }
  job?: {
    probationEnd?: string
    transferOutDate?: string
    jobStartDate?: string
  }
}

/**
 * STA-82 A5 — probation end date must be after the hire date.
 * Crosses Step 2 (Job) → Step 1 (Identity) so it cannot live inside either
 * step's `.superRefine`.
 */
export function probationEndAfterHire(
  data: CrossStepRuleInput,
): CrossStepRuleResult {
  const probationEnd = data.job?.probationEnd
  const hireDate = data.identity?.hireDate
  if (!probationEnd || !hireDate) return true
  if (new Date(probationEnd) > new Date(hireDate)) return true
  return {
    path: ['job', 'probationEnd'],
    message:
      'วันสิ้นสุดทดลองงานต้องหลังวันที่จ้าง (Probation end must be after hire date)',
  }
}

/**
 * STA-82 A5 — transfer-out date must be after the current job start date.
 * Both fields live on `job` but conceptually belong to different sub-schemas
 * (Classification vs Transfer-Band), so the rule lives here for clarity and
 * consistency with the cross-step composition pattern.
 */
export function transferOutAfterJobStart(
  data: CrossStepRuleInput,
): CrossStepRuleResult {
  const transferOutDate = data.job?.transferOutDate
  const jobStartDate = data.job?.jobStartDate
  if (!transferOutDate || !jobStartDate) return true
  if (new Date(transferOutDate) > new Date(jobStartDate)) return true
  return {
    path: ['job', 'transferOutDate'],
    message:
      'วันโอนย้ายต้องหลังวันเริ่มงาน (Transfer-out date must be after job start)',
  }
}

export type CrossStepRule = (data: CrossStepRuleInput) => CrossStepRuleResult

const STEP_2_3_RULES: ReadonlyArray<CrossStepRule> = [
  probationEndAfterHire,
  transferOutAfterJobStart,
]

/**
 * STA-82 A5 — return the cross-step rules that apply at a given wizard step.
 *
 * Step 1 (Identity / Who) has no cross-step gates yet — returns [].
 * Step 2 (Job) and Step 3 (Review) both run the same rule set: Review must
 * enforce them so Submit is gated when a cross-step constraint fails
 * (per ADR-4 Step-3 submit-gate).
 */
export function crossStepRulesFor(
  step: number,
): ReadonlyArray<CrossStepRule> {
  return step >= 2 ? STEP_2_3_RULES : []
}

/** Convenience for callers that only want a boolean (e.g. inside checkStepValid). */
export function passesAllCrossStepRules(
  step: number,
  data: CrossStepRuleInput,
): boolean {
  return crossStepRulesFor(step).every((rule) => rule(data) === true)
}

/** All failures for the step, for surfacing inline errors in summary rows. */
export function collectCrossStepFailures(
  step: number,
  data: CrossStepRuleInput,
): ReadonlyArray<CrossStepRuleFailure> {
  const out: CrossStepRuleFailure[] = []
  for (const rule of crossStepRulesFor(step)) {
    const result = rule(data)
    if (result !== true) out.push(result)
  }
  return out
}
