// ── EC "maintain employee" per-subsection editability registry (STA-244) ──────────
//
// Values derive from the SAME "EC-list-of-fields V0.2.xlsx" as
// sta82-employee-profile-field-spec.ts. For the mockup phase they are HAND-AUTHORED
// from current /profile/me behavior (the repo spec carries no usable edit-mode/
// cardinality signal — see plan §"Critical grounding"): the xlsx cardinality column
// (K) was never propagated into the repo spec, and edit-mode has no clean column
// (require_hr_confirm is FALSE for all rows). POST-MOCKUP: fold
// cardinality/editMode/requiredDocs into the sta82 spec GENERATOR and delete this
// file — do NOT maintain two spec files long-term.
//
// This registry drives AFFORDANCES only (attachment requirement, cardinality label,
// approval badge). It NEVER rewires any section's submit handler — a regression AC
// guards the 7 live edit flows.

import type { SectionId } from '@/app/[locale]/profile/me/page'; // 'personal'|'marital'|'contact'|'advanced'
import type { SectionKey } from '@/stores/cnext-profile-slice'; // slice discriminator

export type Cardinality = 1 | 'N';
export type EditMode = 'direct' | 'approval' | 'view'; // 'view' reserved; NOT wired this ticket
export type MaintainKey = SectionId | SectionKey; // EXISTING vocabularies only — no third one

export interface MaintainConfig {
  key: MaintainKey;
  /** 1 = single entry (one card); 'N' = repeatable (add/remove rows). */
  cardinality: Cardinality;
  /** direct = commits immediately; approval = change-request; view = read-only (reserved). */
  editMode: EditMode;
  /** i18n keys for docs required before submit; [] = none. */
  requiredDocs: string[];
  /** Traceability back to the sta82 field spec. */
  sta82Ref: { section: string; subsection: string };
  /**
   * For sections that hold BOTH a scalar group and an array group (see `contact`),
   * the 1-vs-N split is component-owned (structural), NOT registry-driven. When true,
   * `cardinality` is documentary and `editMode` drives presentation only.
   */
  cardinalityIntrinsic?: boolean;
}

// Single i18n doc key shared by the identity-gated sections. Mirrors the current
// ATTACHMENT_REQUIRED_FIELDS gate on /profile/me (identity + marital fields) — seeded
// from behavior, NOT from any spreadsheet column letter (avoids the
// "Direct edit"/"Direct Edit" casing hazard in the export).
const IDENTITY_PROOF_DOC = 'ecMaintain.doc.identityProof';

export const EC_MAINTAIN_REGISTRY: MaintainConfig[] = [
  // ── SectionId modal sections (approval — submitChangeRequest, NO save()) ──────
  {
    key: 'personal',
    cardinality: 1,
    editMode: 'approval',
    requiredDocs: [IDENTITY_PROOF_DOC],
    sta82Ref: { section: 'Personal Information', subsection: 'Personal Info' },
  },
  {
    key: 'marital',
    cardinality: 1,
    editMode: 'approval',
    requiredDocs: [IDENTITY_PROOF_DOC],
    sta82Ref: { section: 'Personal Information', subsection: 'Marital Status' },
  },
  {
    // Dual-purpose: scalar modal fields (SectionId, cardinality 1, approval) AND the
    // phones/emails array card (SectionKey, cardinality N, direct + save()). Both
    // submit sectionKey:'contact', so neither identifier distinguishes them. We do
    // NOT invent a `contactArray` token (that would be a third vocabulary). Instead
    // cardinality is intrinsic (component-owned) and editMode is presentation-only;
    // the array card keeps its current direct+save() behavior untouched.
    key: 'contact',
    cardinality: 1,
    editMode: 'approval',
    requiredDocs: [],
    sta82Ref: { section: 'Personal Information', subsection: 'Contact Info' },
    cardinalityIntrinsic: true,
  },
  {
    key: 'advanced',
    cardinality: 1,
    editMode: 'approval',
    requiredDocs: [],
    sta82Ref: { section: 'Personal Information', subsection: 'Advanced' },
  },
  // ── SectionKey standalone sections (direct — submitChangeRequest AND save()) ──
  {
    key: 'address',
    cardinality: 1,
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Contact Information', subsection: 'Address' },
  },
  {
    key: 'bank',
    cardinality: 1,
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Payment Information', subsection: 'Bank Account' },
  },
  {
    key: 'emergencyContact',
    cardinality: 'N',
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Emergency', subsection: 'Emergency Contacts' },
  },
  {
    key: 'dependents',
    cardinality: 'N',
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Family', subsection: 'Dependents' },
  },
  // ── STA-244 repeatable (N) sections (direct — submitChangeRequest AND save()) ──
  // SINGULAR registry keys; their store arrays are PLURAL. The full 47-group
  // employee-editable cardinality table lives in
  // specs/sta-244-multi-entry-fields.json (the SSoT); this registry documents only
  // the wired subset.
  {
    key: 'formalEducation',
    cardinality: 'N',
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Education', subsection: 'Formal Education' },
  },
  {
    key: 'languageSkill',
    cardinality: 'N',
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Qualifications', subsection: 'Language Skills' },
  },
  {
    key: 'workPermit',
    cardinality: 'N',
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Work Eligibility', subsection: 'Work Permit Info' },
  },
  {
    key: 'certification',
    cardinality: 'N',
    editMode: 'direct',
    requiredDocs: [],
    sta82Ref: { section: 'Qualifications', subsection: 'Certification/License' },
  },
];

const REGISTRY_BY_KEY = new Map<MaintainKey, MaintainConfig>(
  EC_MAINTAIN_REGISTRY.map((config) => [config.key, config]),
);

/**
 * Resolve the maintain config for a seeded section, keyed by the page's EXISTING
 * identifier (`SectionId` for modal sections, `SectionKey` for array editors).
 * Throws for unseeded keys — a missing/mislabeled seed is a bug, not a silent default.
 */
export function getMaintainConfig(key: MaintainKey): MaintainConfig {
  const config = REGISTRY_BY_KEY.get(key);
  if (!config) {
    throw new Error(
      `[ec-maintain-registry] No maintain config seeded for key "${key}". Seeded keys: ${[
        ...REGISTRY_BY_KEY.keys(),
      ].join(', ')}`,
    );
  }
  return config;
}
