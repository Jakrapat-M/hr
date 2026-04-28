// Cross-cutting derivation rules for SF mapper
// Source: plan v2 errata Round 2, phase-0-verify-resolution-2026-04-28.md

// XX-XXX-EIM-OI-SetFlagForeigner: PerPersonal.customString14 = '1' if nationality !== THA else '0'
// Source: SF business rule, plan errata Round 2 — note customString14 (NOT customString13, which is sys_EC-PY_MiddlennameEN)
export function deriveForeignerFlag(nationalityIso3: string | null | undefined): '0' | '1' {
  return nationalityIso3 && nationalityIso3.toUpperCase() === 'THA' ? '0' : '1'
}

// SF "high date" sentinel for active records — used for endDate on hire (when not omitted)
export { SF_HIGH_DATE } from './types'

// ISO yyyy-mm-dd → SF /Date(epochMs)/ format
// SF expects dates in OData JSON V2 format: "/Date(631152000000)/"
export function toSfDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return null
  return `/Date(${ms})/`
}

// User CREATE: derive userId from employeeId (8-digit Central Group convention)
export function deriveUserId(employeeId: string): string {
  return employeeId.trim()
}

// User CREATE: derive username from primary email (Q5 decision: auto-generate from email)
// Falls back to userId when no primary email is set
export function deriveUsername(primaryEmail: string | undefined, userId: string): string {
  if (primaryEmail && primaryEmail.includes('@')) return primaryEmail.toLowerCase()
  return userId
}
