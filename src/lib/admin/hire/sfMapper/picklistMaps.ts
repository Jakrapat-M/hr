// SF picklist code translation tables
// Form codes → SF picklist externalCodes for all fields that need translation
// Source: .omc/research/MISSING-PICKLISTS.md + phase-0-verify-resolution-2026-04-28.md

// Phone type: form codes → SF ecPhoneType codes
// Source: MISSING-PICKLISTS.md (ecPhoneType, 5 opts)
export const PHONE_TYPE_FORM_TO_SF = {
  mobile: 'C',  // Personal Mobile
  office: 'B',  // Business
  home: 'H',    // Home
} as const

// Email type: form codes → SF ecEmailType codes
// Source: MISSING-PICKLISTS.md (ecEmailType, 2 opts)
export const EMAIL_TYPE_FORM_TO_SF = {
  personal: 'P',
  work: 'B',
} as const

// National ID card type: form codes → SF cardType codes
// Per Q6 user decision: only tni/tni2/PN supported; WORK_PERMIT/ALIEN_ID/OTHER are dropped from the form picklist (not present here means they shouldn't appear).
export const NID_CARD_TYPE_FORM_TO_SF = {
  NATIONAL_ID: 'tni',
  NATIONAL_ID_2: 'tni2',  // Thai National Identification Number (2) — for dual-company employees
  PASSPORT: 'PN',
} as const

// Salutation EN: form codes → SF salutation picklist externalCodes (6 opts: 1=Mr., 2=Mrs., 3=Miss, 5=นาย, 6=นาง, 7=นางสาว)
// Plan errata round 2 — verify final mapping in Phase 1.3
export const SALUTATION_EN_FORM_TO_SF = {
  MR: '1',
  MRS: '2',
  MS: '3',
  // DR has no SF equivalent — flagged to user as Q (not yet decided)
} as const

// Marital status — Q7 user decision: drop WIDOWED/SEPARATED (not in SF picklist)
// SF ecMaritalStatus 5 opts: M=Married, E=Engaged/Separated (TBD), D=Divorced/Widowed, S=Single, N=Married not registered
export const MARITAL_STATUS_FORM_TO_SF = {
  SINGLE: 'S',
  MARRIED: 'M',
  DIVORCED: 'D',
  // WIDOWED and SEPARATED dropped per Q7 — should not appear in form picklist
} as const

// TODO Phase 4: NID card-type reverse map (SF → form) for future read-back support
// TODO Phase 3: EmpJob picklist mappings (employeeGroup, employeeSubGroup, jobFamily, contractType, etc.)
// TODO Phase 2: Address picklists (province/district/sub-district/postal code) — these are SF picklist externalCodes used directly, no form-side translation needed
