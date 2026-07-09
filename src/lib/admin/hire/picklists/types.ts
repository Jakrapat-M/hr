// types.ts — Picklist registry types (STA-82 Stage A1)
// Mockup phase: TS-const arrays, no async, tree-shakeable per Picklist ID.

export interface PicklistOption {
  /** Canonical code/id used by store values and SF mapping. */
  id: string
  /** Thai label — UI default. */
  labelTh: string
  /** English label — used when locale = en. */
  labelEn: string
}

export type PicklistDefinition = readonly PicklistOption[]

/**
 * pickLabel — return the locale-correct label for a PicklistOption.
 * Used by picklist consumers so each component doesn't reinvent locale resolution.
 */
export function pickLabel(option: PicklistOption, locale: 'th' | 'en'): string {
  return locale === 'en' ? option.labelEn : option.labelTh
}
