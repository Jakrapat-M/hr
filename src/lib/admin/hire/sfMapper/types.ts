// SF mapper foundational types
// Phase 1.1 scaffold — stubs return PENDING; real bodies arrive Phase 1.3+
// Source: hire-form-sf-parity-2026-04-28-plan-v2.md §2

// SF API verb per portlet (per CREATE-VS-UPSERT.md)
export type SfApiVerb = 'CREATE' | 'UPSERT' | 'PENDING'

// Output of every mapper.build()
export interface MapperResult<T = Record<string, unknown>> {
  /** SF API verb. PENDING means stub — real implementation arrives in pendingUntilPhase. */
  verb: SfApiVerb
  /** Single-record entities return one payload; multi-record entities return T[]. null when verb=PENDING. */
  payload: T | T[] | null
  /** Phase number that completes this mapper (Phase 1, 2, 3, 4, 5, 5b, 6). Used by parity test allowlist. */
  pendingUntilPhase?: 1 | 2 | 3 | 4 | 5 | 6
  /** Human-readable trace notes — what's deferred and why. */
  notes?: string[]
}

// Each portlet exports a PortletMapper conforming to this shape
export interface PortletMapper<TOutput = Record<string, unknown>> {
  /** SF entity name as it appears in OData metadata (e.g. "PerPersonal", "EmpJob") */
  readonly entity: string
  /** API verb known at module load time (CREATE for User, UPSERT for everything else, PENDING for not-yet-implemented) */
  readonly verb: SfApiVerb
  /** Build the SF payload from current form state. Phase-1 stubs return verb=PENDING + payload=null. */
  build(input: import('../../store/useHireWizard').FormData, opts?: BuildOptions): MapperResult<TOutput>
}

export interface BuildOptions {
  /** Effective date / hire date — used as startDate on most UPSERT records. ISO yyyy-mm-dd. */
  effectiveDate?: string
  /** Logger for derivation traces (debug only). */
  trace?: (msg: string) => void
}

// SF "high date" sentinel for active records (no end date)
export const SF_HIGH_DATE = '9999-12-31'

// Helper for constructing PENDING result
export function pending<T>(notes: string[], pendingUntilPhase: 1 | 2 | 3 | 4 | 5 | 6): MapperResult<T> {
  return { verb: 'PENDING', payload: null, pendingUntilPhase, notes }
}
