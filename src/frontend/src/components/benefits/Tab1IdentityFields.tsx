'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { FormField, FormInput, Button } from '@/components/humi';
import {
  deriveRecordTypeFromBenefitTypeGroup,
  type PlanCategory,
  type WorkflowTemplate,
} from '@/data/benefits/plan-registry';
import { COMPANY_LEGAL_ENTITIES, ADD_NEW_COMPANY, companyLabel, parseCompanies, joinCompanies } from '@/data/benefits/company-registry';

export type CountryCode = 'TH' | 'VN';
export type PlanStatus = 'active' | 'inactive' | 'draft';
export type BenefitTypeGroup = 'reimbursement-employee-hr' | 'reimbursement-hr' | 'info' | 'record';
// STA-70 follow-up (spec expanded with Enrolment / Claim condition / Legal entity sections)
export type EnrolmentMode = 'auto' | 'manual';
export type ClaimPeriod = 'year' | 'month' | 'quarter' | 'one-time' | 'lifetime';
export type EntitlementCalcMethod = 'full' | 'prorate';
export type EligibleClaimDate = '30' | '60' | '90' | 'none';

export interface Tab1IdentityValues {
  ttt: string;
  planKey: string;
  nameTh: string;
  nameEn: string;
  category: PlanCategory;
  schemaVersion: 'v1' | 'v2';
  template: WorkflowTemplate;
  effectiveFrom: string;
  effectiveTo: string;
  // STA-70 — Benefit info + Benefit type/group
  country: CountryCode;
  status: PlanStatus;
  benefitTypeGroup: BenefitTypeGroup;
  // STA-70 follow-up — Enrolment
  enrolment: EnrolmentMode;
  // STA-70 follow-up — Claim condition
  claimPeriod: ClaimPeriod;
  entitlementCalcMethod: EntitlementCalcMethod;
  eligibleClaimDate: EligibleClaimDate;
  // STA-179 — Special claim condition (Yes/No) + revealed condition type
  specialClaimCondition: 'yes' | 'no' | '';
  specialClaimConditionType: string;
  // STA-70 follow-up — Legal entity
  company: string;
}

// STA-179 — the 4 fixed condition options revealed when Special claim condition = Yes.
const SPECIAL_CLAIM_CONDITION_OPTIONS: { value: string; labelTh: string; labelEn: string }[] = [
  { value: 'ePatient',              labelTh: 'ePatient',              labelEn: 'ePatient' },
  { value: 'Tops care',            labelTh: 'Tops care',            labelEn: 'Tops care' },
  { value: 'Non-IPD employee list', labelTh: 'รายชื่อพนักงาน Non-IPD', labelEn: 'Non-IPD employee list' },
  { value: 'Fleet card',           labelTh: 'Fleet card',           labelEn: 'Fleet card' },
];

export interface Tab1IdentityFieldsProps {
  values: Tab1IdentityValues;
  onChange: <K extends keyof Tab1IdentityValues>(field: K, value: Tab1IdentityValues[K]) => void;
  mode: 'create' | 'edit';
  isTh: boolean;
  /** STA-139: show the "Schema version" radio. Defaults true so the component
   *  contract is unchanged; the legacy plan Create/Edit modals pass false
   *  (the value still persists as 'v2', only the input control is hidden). */
  showSchemaVersion?: boolean;
  /** STA-146: when set, every identity control is disabled EXCEPT the keys
   *  listed here (the Insert plan modal passes INSERT_EDITABLE_KEYS). Omitted
   *  (default) = nothing locked → create/correction byte-for-byte unchanged.
   *  Locking is view-only; it never fires onChange. Fail-safe: any key NOT in
   *  this list is LOCKED, so a newly added identity field defaults to locked. */
  lockExceptKeys?: ReadonlyArray<keyof Tab1IdentityValues>;
}

/** STA-146: the ONLY identity keys that stay editable in Insert mode — everything
 *  else is locked deny-by-default. Imported by PlanFormModal (call site) AND the
 *  Vitest regression (to derive the locked set) — single source of truth. */
export const INSERT_EDITABLE_KEYS = ['status', 'company'] as const;

const CATEGORY_LABELS_TH: Record<PlanCategory, string> = {
  medical:     'การรักษาพยาบาล',
  dental:      'ทันตกรรม',
  physical:    'กายภาพ',
  gasoline:    'น้ำมันรถ',
  toll:        'ทางด่วน',
  parking:     'ที่จอดรถ',
  life:        'ชีวิต',
  gift:        'ของขวัญ',
  funeral:     'ฌาปนกิจ',
  wreath:      'พวงหรีด',
  beneficiary: 'ผู้รับผลประโยชน์',
  lifecycle:   'วงจรสวัสดิการ',
  mobile:      'ค่าโทรศัพท์',
};

const CATEGORY_LABELS_EN: Record<PlanCategory, string> = {
  medical:     'Medical',
  dental:      'Dental',
  physical:    'Physical',
  gasoline:    'Gasoline',
  toll:        'Toll',
  parking:     'Parking',
  life:        'Life',
  gift:        'Gift',
  funeral:     'Funeral',
  wreath:      'Wreath',
  beneficiary: 'Beneficiary',
  lifecycle:   'Lifecycle',
  mobile:      'Mobile',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS_EN) as PlanCategory[];

const selectClass =
  'h-10 w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas disabled:bg-canvas-soft disabled:text-ink-muted disabled:cursor-not-allowed';

const RECORD_TYPE_CHIP: Record<string, { label: string; labelTh: string; className: string }> = {
  records:  { label: 'records',   labelTh: 'records',   className: 'bg-canvas-soft text-ink-muted border border-hairline' },
  info:     { label: 'info',      labelTh: 'info',      className: 'bg-accent-soft text-accent border border-accent/30' },
  claimable:{ label: 'claimable', labelTh: 'claimable', className: 'bg-success-soft text-success border border-success/30' },
};

const TEMPLATE_OPTIONS: WorkflowTemplate[] = [
  'simple-claim',
  'hospital-claim',
  'records-flat',
  'records-dependent',
  'records-computed',
  'lifecycle-admin',
];

/**
 * Tab1IdentityFields — pure component; no internal state.
 * Parent (modal) owns all state via `values` + `onChange`.
 *
 * Fields: TTT, Plan key, nameTh, nameEn, prefix selector,
 *         category, schemaVersion, template, effectiveFrom, effectiveTo.
 */
export function Tab1IdentityFields({
  values,
  onChange,
  mode,
  isTh,
  showSchemaVersion = true,
  lockExceptKeys,
}: Tab1IdentityFieldsProps) {
  // STA-146: deny-by-default lock. With a truthy lockExceptKeys, any key NOT in
  // it is locked (disabled, view-only); undefined → nothing locked (create/
  // correction unchanged). Locking never fires onChange.
  const isLocked = (key: keyof Tab1IdentityValues) =>
    !!lockExceptKeys && !lockExceptKeys.includes(key);

  // STA-70: recordType is derived from the Benefit type/group — the manual
  // "Plan name prefix" radio was removed. No useEffect; pure derivation.
  const derivedRecordType = deriveRecordTypeFromBenefitTypeGroup(values.benefitTypeGroup);

  const chip = RECORD_TYPE_CHIP[derivedRecordType];

  // STA-108: Company is a multi-select of legal entities rendered as removable
  // chips. Storage stays a comma-joined string (Tab1Values.company: string) so
  // the plan type/builders are untouched (mockup phase). "+ Add new company"
  // (STA-86) still lets an admin type a one-off custom entity as a chip.
  const selectedCompanies = parseCompanies(values.company);
  const [companyAddNew, setCompanyAddNew] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const setCompanies = (arr: string[]) => onChange('company', joinCompanies(arr));
  const addCompany = (v: string) => {
    // Strip commas — the comma is the storage delimiter, so a custom name with
    // a comma would otherwise split into multiple chips on re-open.
    const val = v.replace(/,/g, ' ').trim().replace(/\s+/g, ' ');
    if (val && !selectedCompanies.includes(val)) setCompanies([...selectedCompanies, val]);
  };
  const removeCompany = (v: string) => setCompanies(selectedCompanies.filter((c) => c !== v));
  const availableCompanies = COMPANY_LEGAL_ENTITIES.filter((c) => !selectedCompanies.includes(c.value));

  return (
    <div className="space-y-5">
      {/* ── Benefit info section — moved to top per STA-84 ──────────────── */}
      <div className="border-b border-hairline pb-5">
        <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-muted">
          {isTh ? 'ข้อมูลสวัสดิการ (Benefit info)' : 'Benefit info'}
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Country */}
          <FormField
            id="tab1-country"
            label={isTh ? 'ประเทศ (Country)' : 'Country'}
            required
          >
            {(cp) => (
              <select
                {...cp}
                value={values.country}
                onChange={(e) => onChange('country', e.target.value as CountryCode)}
                disabled={isLocked('country')}
                className={selectClass}
              >
                <option value="TH">{isTh ? 'ไทย (TH)' : 'Thailand (TH)'}</option>
                <option value="VN">{isTh ? 'เวียดนาม (VN)' : 'Vietnam (VN)'}</option>
              </select>
            )}
          </FormField>

          {/* Status */}
          <FormField
            id="tab1-status"
            label={isTh ? 'สถานะ (Status)' : 'Status'}
            required
          >
            {(cp) => (
              <select
                {...cp}
                value={values.status}
                onChange={(e) => onChange('status', e.target.value as PlanStatus)}
                disabled={isLocked('status')}
                className={selectClass}
              >
                {/* STA-146 FU (Tan): the editable Status select offers only
                    Active/Inactive — "user does not use draft status in benefit
                    plan/benefit rule". Draft can no longer be created (the
                    Save-as-Draft button + status filter were retired); the
                    'draft' PlanStatus value is kept ONLY defensively, so a legacy
                    draft plan still shows its true status below instead of coercing. */}
                <option value="active">{isTh ? 'ใช้งาน (Active)' : 'Active'}</option>
                <option value="inactive">{isTh ? 'ไม่ใช้งาน (Inactive)' : 'Inactive'}</option>
                {/* A plan saved as Draft keeps showing its true status here (a
                    DISABLED option) instead of silently coercing to Active — but
                    Draft stays non-selectable for new edits. */}
                {values.status === 'draft' && (
                  <option value="draft" disabled>{isTh ? 'ฉบับร่าง (Draft)' : 'Draft'}</option>
                )}
              </select>
            )}
          </FormField>
        </div>
      </div>

      {/* 1. TTT reference */}
      <FormField
        id="tab1-ttt"
        label={isTh ? 'รหัส TTT' : 'TTT reference'}
      >
        {(cp) => (
          <FormInput
            {...cp}
            value={values.ttt}
            onChange={(e) => onChange('ttt', e.target.value)}
            disabled={isLocked('ttt')}
            placeholder="BE_06"
          />
        )}
      </FormField>

      {/* 2. Plan key */}
      <FormField
        id="tab1-planKey"
        label={isTh ? 'รหัสแผน (Plan key)' : 'Plan key'}
        required
        help={mode === 'edit' ? (isTh ? 'ไม่สามารถแก้ไขได้หลังสร้าง' : 'Cannot change after creation') : undefined}
      >
        {(cp) => (
          <FormInput
            {...cp}
            value={values.planKey}
            onChange={mode === 'edit' ? undefined : (e) => onChange('planKey', e.target.value)}
            disabled={isLocked('planKey')}
            readOnly={mode === 'edit'}
            className={mode === 'edit' ? 'bg-canvas-soft text-ink-muted' : undefined}
            placeholder="BE-MED-005"
          />
        )}
      </FormField>

      {/* 3. Plan name (TH) */}
      <FormField
        id="tab1-nameTh"
        label={isTh ? 'ชื่อแผน (ภาษาไทย)' : 'Plan name (Thai)'}
        required
      >
        {(cp) => (
          <FormInput
            {...cp}
            value={values.nameTh}
            onChange={(e) => onChange('nameTh', e.target.value)}
            disabled={isLocked('nameTh')}
          />
        )}
      </FormField>

      {/* 4. Plan name (EN) */}
      <FormField
        id="tab1-nameEn"
        label={isTh ? 'ชื่อแผน (ภาษาอังกฤษ)' : 'Plan name (English)'}
        required
      >
        {(cp) => (
          <FormInput
            {...cp}
            value={values.nameEn}
            onChange={(e) => onChange('nameEn', e.target.value)}
            disabled={isLocked('nameEn')}
          />
        )}
      </FormField>

      {/* 6. Category */}
      <FormField
        id="tab1-category"
        label={isTh ? 'หมวดหมู่' : 'Category'}
        required
      >
        {(cp) => (
          <select
            {...cp}
            value={values.category}
            onChange={(e) => onChange('category', e.target.value as PlanCategory)}
            disabled={isLocked('category')}
            className={selectClass}
          >
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {isTh ? CATEGORY_LABELS_TH[cat] : CATEGORY_LABELS_EN[cat]}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {/* 7. schemaVersion radio — STA-139: hidden on the legacy plan modals
          (gated false); the value still persists as 'v2'. */}
      {showSchemaVersion && (
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">
            {isTh ? 'เวอร์ชันโครงสร้าง' : 'Schema version'}
          </span>
          <div className="flex flex-wrap gap-4" role="radiogroup" aria-label={isTh ? 'เวอร์ชันโครงสร้าง' : 'Schema version'}>
            {(['v1', 'v2'] as const).map((sv) => (
              <label key={sv} className="flex items-center gap-2 cursor-pointer text-small text-ink">
                <input
                  type="radio"
                  name="tab1-schemaVersion"
                  value={sv}
                  checked={values.schemaVersion === sv}
                  onChange={() => onChange('schemaVersion', sv)}
                  className="accent-accent"
                />
                {sv === 'v1'
                  ? (isTh ? 'v1 (legacy)' : 'v1 (legacy)')
                  : (isTh ? 'v2 (hybrid)' : 'v2 (hybrid)')}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 8. Template picker */}
      <FormField
        id="tab1-template"
        label={isTh ? 'เทมเพลตเวิร์กโฟลว์' : 'Workflow template'}
        required
      >
        {(cp) => (
          <select
            {...cp}
            value={values.template}
            onChange={(e) => onChange('template', e.target.value as WorkflowTemplate)}
            disabled={isLocked('template')}
            className={selectClass}
          >
            {TEMPLATE_OPTIONS.map((tpl) => (
              <option key={tpl} value={tpl}>{tpl}</option>
            ))}
          </select>
        )}
      </FormField>

      {/* 9. Effective dates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="tab1-effectiveFrom"
          label={isTh ? 'วันที่เริ่มมีผล' : 'Effective from'}
        >
          {(cp) => (
            <FormInput
              {...cp}
              type="date"
              value={values.effectiveFrom}
              onChange={(e) => onChange('effectiveFrom', e.target.value)}
              disabled={isLocked('effectiveFrom')}
            />
          )}
        </FormField>

        <FormField
          id="tab1-effectiveTo"
          label={isTh ? 'วันที่สิ้นสุด' : 'Effective to'}
        >
          {(cp) => (
            <FormInput
              {...cp}
              type="date"
              value={values.effectiveTo}
              onChange={(e) => onChange('effectiveTo', e.target.value)}
              disabled={isLocked('effectiveTo')}
            />
          )}
        </FormField>
      </div>

      {/* ── STA-70 Benefit type / group section ─────────────────────────── */}
      <div className="border-t border-hairline pt-5">
        <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-muted">
          {isTh ? 'ประเภท / กลุ่มสวัสดิการ (Benefit type / group)' : 'Benefit type / group'}
        </h3>

        {/* 12. Benefit type */}
        <FormField
          id="tab1-benefitTypeGroup"
          label={isTh ? 'ประเภทสวัสดิการ (Benefit type)' : 'Benefit type'}
          required
        >
          {(cp) => (
            <select
              {...cp}
              value={values.benefitTypeGroup}
              onChange={(e) => onChange('benefitTypeGroup', e.target.value as BenefitTypeGroup)}
              disabled={isLocked('benefitTypeGroup')}
              className={selectClass}
            >
              <option value="reimbursement-employee-hr">
                {isTh ? 'Reimbursement: Employee/HR' : 'Reimbursement: Employee/HR'}
              </option>
              <option value="reimbursement-hr">
                {isTh ? 'Reimbursement: HR' : 'Reimbursement: HR'}
              </option>
              <option value="info">{isTh ? 'Info.' : 'Info.'}</option>
              <option value="record">{isTh ? 'Record' : 'Record'}</option>
            </select>
          )}
        </FormField>

        {/* STA-70: recordType is derived from the Benefit type above (the manual
            prefix radio was removed) — shown read-only so admins see the result. */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-small text-ink-muted">
            {isTh ? 'ประเภทระเบียนที่ได้:' : 'Derived record type:'}
          </span>
          <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.1em] ${chip.className}`}>
            {isTh ? chip.labelTh : chip.label}
          </span>
        </div>
      </div>

      {/* ── STA-70 Enrolment section ────────────────────────────────────── */}
      <div className="border-t border-hairline pt-5">
        <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-muted">
          {isTh ? 'การลงทะเบียน (Enrolment)' : 'Enrolment'}
        </h3>

        {/* 13. Enrolment mode */}
        <FormField
          id="tab1-enrolment"
          label={isTh ? 'รูปแบบการลงทะเบียน (Enrolment)' : 'Enrolment'}
          required
        >
          {(cp) => (
            <select
              {...cp}
              value={values.enrolment}
              onChange={(e) => onChange('enrolment', e.target.value as EnrolmentMode)}
              disabled={isLocked('enrolment')}
              className={selectClass}
            >
              <option value="auto">{isTh ? 'Auto Enrolment (อัตโนมัติ)' : 'Auto Enrolment'}</option>
              <option value="manual">{isTh ? 'Manual Enrolment (ลงทะเบียนเอง)' : 'Manual Enrolment'}</option>
            </select>
          )}
        </FormField>
      </div>

      {/* ── STA-70 Claim condition section ──────────────────────────────── */}
      <div className="border-t border-hairline pt-5">
        <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-muted">
          {isTh ? 'เงื่อนไขการเบิก (Claim condition)' : 'Claim condition'}
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 14. Claim period */}
          <FormField
            id="tab1-claimPeriod"
            label={isTh ? 'รอบการเบิก (Claim period)' : 'Claim period'}
            required
          >
            {(cp) => (
              <select
                {...cp}
                value={values.claimPeriod}
                onChange={(e) => onChange('claimPeriod', e.target.value as ClaimPeriod)}
                disabled={isLocked('claimPeriod')}
                className={selectClass}
              >
                <option value="year">{isTh ? 'รายปี (Year)' : 'Year'}</option>
                <option value="month">{isTh ? 'รายเดือน (Month)' : 'Month'}</option>
                <option value="quarter">{isTh ? 'รายไตรมาส (Quarter)' : 'Quarter'}</option>
                <option value="one-time">{isTh ? 'ครั้งเดียว (One-time)' : 'One-time'}</option>
                <option value="lifetime">{isTh ? 'ตลอดชีพ (Lifetime)' : 'Lifetime'}</option>
              </select>
            )}
          </FormField>

          {/* 15. Entitlement calculation method */}
          <FormField
            id="tab1-entitlementCalcMethod"
            label={isTh ? 'วิธีคำนวณวงเงิน (Entitlement calc)' : 'Entitlement calc method'}
            required
          >
            {(cp) => (
              <select
                {...cp}
                value={values.entitlementCalcMethod}
                onChange={(e) => onChange('entitlementCalcMethod', e.target.value as EntitlementCalcMethod)}
                disabled={isLocked('entitlementCalcMethod')}
                className={selectClass}
              >
                <option value="full">{isTh ? 'เต็มจำนวน (Full)' : 'Full'}</option>
                <option value="prorate">{isTh ? 'ตามสัดส่วน (Prorate)' : 'Prorate'}</option>
              </select>
            )}
          </FormField>
        </div>

        {/* 16. Special claim condition (STA-179) — Yes/No; "Yes" reveals a fixed
            4-option condition dropdown. Both keys are absent from
            INSERT_EDITABLE_KEYS, so they auto-lock (disabled) in Insert mode. */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            id="tab1-specialClaimCondition"
            label={isTh ? 'เงื่อนไขการเบิกพิเศษ (Special claim condition)' : 'Special claim condition'}
          >
            {(cp) => (
              <select
                {...cp}
                value={values.specialClaimCondition}
                onChange={(e) => onChange('specialClaimCondition', e.target.value as Tab1IdentityValues['specialClaimCondition'])}
                disabled={isLocked('specialClaimCondition')}
                className={selectClass}
              >
                <option value="no">{isTh ? 'ไม่ใช่ (No)' : 'No'}</option>
                <option value="yes">{isTh ? 'ใช่ (Yes)' : 'Yes'}</option>
              </select>
            )}
          </FormField>

          {values.specialClaimCondition === 'yes' && (
            <FormField
              id="tab1-specialClaimConditionType"
              label={isTh ? 'เงื่อนไข (Condition)' : 'Condition'}
            >
              {(cp) => (
                <select
                  {...cp}
                  value={values.specialClaimConditionType}
                  onChange={(e) => onChange('specialClaimConditionType', e.target.value)}
                  disabled={isLocked('specialClaimConditionType')}
                  className={selectClass}
                >
                  <option value="">{isTh ? '— เลือกเงื่อนไข —' : '— Select condition —'}</option>
                  {SPECIAL_CLAIM_CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isTh ? opt.labelTh : opt.labelEn}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          )}
        </div>

      </div>

      {/* ── STA-70 Legal Entity section ─────────────────────────────────── */}
      <div className="border-t border-hairline pt-5">
        <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-ink-muted">
          {isTh ? 'นิติบุคคล (Legal Entity)' : 'Legal Entity'}
        </h3>

        {/* 17. Company — STA-108: multi-select legal entities as removable chips
            (+ STA-86 "Add new company" free-text). Stored comma-joined. */}
        <FormField
          id="tab1-company"
          label={isTh ? 'บริษัท (Company)' : 'Company'}
        >
          {(cp) => (
            <select
              {...cp}
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === ADD_NEW_COMPANY) {
                  setCompanyAddNew(true);
                } else if (v) {
                  addCompany(v);
                }
              }}
              className={selectClass}
            >
              <option value="">
                {isTh ? '— เลือกบริษัท —' : '— Select company —'}
              </option>
              {availableCompanies.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
              <option value={ADD_NEW_COMPANY}>
                {isTh ? '+ เพิ่มบริษัทใหม่' : '+ Add new company'}
              </option>
            </select>
          )}
        </FormField>

        {/* Selected company chips — each individually removable */}
        {selectedCompanies.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCompanies.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-accent/30 bg-accent-soft px-2.5 py-1 text-small font-medium text-accent"
              >
                {companyLabel(c)}
                <button
                  type="button"
                  aria-label={isTh ? `ลบ ${companyLabel(c)}` : `remove ${companyLabel(c)}`}
                  title={isTh ? 'ลบ' : 'Remove'}
                  onClick={() => removeCompany(c)}
                  className="inline-flex items-center justify-center rounded-full p-0.5 text-accent/70 transition-colors hover:bg-accent/15 hover:text-danger"
                >
                  <X size={13} aria-hidden />
                </button>
              </span>
            ))}
          </div>
        )}

        {companyAddNew && (
          <div className="mt-3">
            <FormField
              id="tab1-company-new"
              label={isTh ? 'ชื่อบริษัทใหม่' : 'New company name'}
            >
              {(cp) => (
                <div className="flex items-center gap-2">
                  <FormInput
                    {...cp}
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCompany(newCompanyName);
                        setNewCompanyName('');
                        setCompanyAddNew(false);
                      }
                    }}
                    placeholder={isTh ? 'เช่น Central Group' : 'e.g. Central Group'}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      addCompany(newCompanyName);
                      setNewCompanyName('');
                      setCompanyAddNew(false);
                    }}
                  >
                    {isTh ? 'เพิ่ม' : 'Add'}
                  </Button>
                </div>
              )}
            </FormField>
          </div>
        )}
      </div>
    </div>
  );
}
