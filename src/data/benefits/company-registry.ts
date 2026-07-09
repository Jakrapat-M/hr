// STA-86 / STA-108 — Legal-entity company registry (mockup phase).
// The benefit-plan configurator's "Company" field is a multi-select (STA-108)
// picking from these legal entities. "+ Add new company" lets an admin type a
// one-off company name that persists in-session only (no backend this phase).

export interface CompanyEntity {
  /** Stored value (legal-entity code). */
  value: string;
  /** Display label, shown as "Name (Code)". */
  label: string;
}

/**
 * Central Group legal entities offered in the Company multi-select.
 * Source: BA legal-entity list (STA-108). Several display names differ from
 * their stored code (e.g. CPA → C118, CRY → C079, TNW → C119).
 */
export const COMPANY_LEGAL_ENTITIES: CompanyEntity[] = [
  { value: 'B2S', label: 'B2S (B2S)' },
  { value: 'CBN', label: 'CBN (CBN)' },
  { value: 'CCB', label: 'CCB (CCB)' },
  { value: 'CCM', label: 'CCM (CCM)' },
  { value: 'CCW', label: 'CCW (CCW)' },
  { value: 'CDS', label: 'CDS (CDS)' },
  { value: 'CDV', label: 'CDV (CDV)' },
  { value: 'C118', label: 'CPA (C118)' },
  { value: 'C079', label: 'CRY (C079)' },
  { value: 'C119', label: 'TNW (C119)' },
];

/** Known legal-entity codes (kept for back-compat with `isKnownCompany`). */
export const COMPANY_OPTIONS: string[] = COMPANY_LEGAL_ENTITIES.map((c) => c.value);

export type CompanyOption = string;

/** Sentinel select value for the "+ Add new company" choice (last option). */
export const ADD_NEW_COMPANY = '__add_new__';

/** True when `value` is one of the known legal entities (not a custom name). */
export function isKnownCompany(value: string): boolean {
  return COMPANY_OPTIONS.includes(value);
}

/** Display label for a stored company value; falls back to the raw value (custom names). */
export function companyLabel(value: string): string {
  return COMPANY_LEGAL_ENTITIES.find((c) => c.value === value)?.label ?? value;
}

/** Parse the comma-joined `company` storage string into a list of values. */
export function parseCompanies(stored: string | null | undefined): string[] {
  return stored ? stored.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

/** Join selected company values back into the comma-joined storage string. */
export function joinCompanies(values: string[]): string {
  return values.join(',');
}
