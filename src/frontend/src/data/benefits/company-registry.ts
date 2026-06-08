// STA-86 — Legal-entity company registry (mockup phase).
// The benefit-plan configurator's "Company" field picks from these legal
// entities. "+ Add new company" lets an admin type a one-off company name
// that persists in-session only (no backend this phase).

/** Known Central Group legal entities offered in the Company dropdown. */
export const COMPANY_OPTIONS = ['CDS', 'CMG', 'RIS'] as const;

export type CompanyOption = (typeof COMPANY_OPTIONS)[number];

/** Sentinel select value for the "+ Add new company" choice (last option). */
export const ADD_NEW_COMPANY = '__add_new__';

/** True when `value` is one of the known legal entities (not a custom name). */
export function isKnownCompany(value: string): value is CompanyOption {
  return (COMPANY_OPTIONS as readonly string[]).includes(value);
}
