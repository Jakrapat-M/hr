'use client';

// ConditionalClaimFields — shared config-driven renderer for benefit-claim
// conditional groups (STA-119). SimpleClaimForm and HospitalClaimForm both use
// this so their conditional field set + behavior are identical for the same
// benefit bucket. Field membership/order comes from claim-field-config; this
// component only renders the descriptors a caller resolves via
// getConditionalFields(bucketsForPlan(plan)).

import { FormField, FormInput, Textarea } from '@/components/humi';
import {
  type ClaimFieldDescriptor,
  type ClaimFieldKey,
  isClaimFieldVisible,
  isClaimFieldRequired,
} from '@/data/benefits/claim-field-config';
import { pickLabel } from '@/lib/admin/hire/picklists/picklistRegistry';

// Bilingual conditional-field labels — mirrors messages/{th,en}.json
// `benefits.claim.*` (kept in sync by the i18n parity test). Inlined to match
// the benefit templates + the test's next-intl mock.
export const CONDITIONAL_CLAIM_LABELS: Record<string, { th: string; en: string }> = {
  medicalDental: { th: 'การแพทย์ / ทันตกรรม', en: 'Medical / Dental' },
  opdIpd: { th: 'OPD / IPD', en: 'OPD / IPD' },
  admittedStart: { th: 'วันที่เริ่มเข้ารักษา (ผู้ป่วยใน)', en: 'Admitted start date' },
  admittedEnd: { th: 'วันที่สิ้นสุดการรักษา (ผู้ป่วยใน)', en: 'Admitted end date' },
  hospitalType: { th: 'ประเภทสถานพยาบาล', en: 'Type of Hospital' },
  hospitalName: { th: 'ชื่อสถานพยาบาล', en: 'Hospital Name' },
  medicalHospitalName: { th: 'ชื่อสถานพยาบาล', en: 'Hospital Name' },
  hospitalOthers: { th: 'ระบุสถานพยาบาลอื่นๆ', en: 'Others (specify hospital)' },
  patientTransferDoc: { th: 'ใช้เอกสารส่งตัวหรือไม่', en: 'Use patient transfer document?' },
  diseaseDetails: { th: 'รายละเอียดอาการ/โรค', en: 'Disease Details' },
  diseaseDetailsDetail: { th: 'ระบุรายละเอียดเพิ่มเติม', en: 'Details' },
  gasolineClaimType: { th: 'ประเภทการเบิก', en: 'Claim Type' },
  physicalInvoice: { th: 'ใบแจ้งหนี้จากโรงพยาบาล', en: 'Invoice from hospital' },
  dependentName: { th: 'ชื่อผู้รับสิทธิ์', en: 'Dependent Name' },
  dependentDob: { th: 'วันเกิด', en: 'Date of Birth' },
  dependentRelationship: { th: 'ความสัมพันธ์', en: 'Relationship Type' },
  realMonthDate: { th: 'เดือนที่ขอเบิก', en: 'Claim month' },
};

const selectClassName =
  'h-10 w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas';

export interface ConditionalClaimFieldsProps {
  /** Conditional descriptors for the plan's buckets (getConditionalFields). */
  fields: ClaimFieldDescriptor[];
  /** Current conditional values keyed by descriptor key. */
  values: Partial<Record<ClaimFieldKey, string>>;
  /** Commit a conditional value. */
  onChange: (key: ClaimFieldKey, value: string) => void;
  /** Id prefix so two forms on a page don't collide (usually plan.id). */
  idPrefix: string;
  isTh: boolean;
}

/**
 * Render one config-driven conditional field. Select options listed in the
 * descriptor's infoOnlyOptionIds (gasoline Fleet-Card "(Info only)" rows, OQ-7)
 * render as disabled so the label is visible but cannot be selected.
 */
function renderField(
  f: ClaimFieldDescriptor,
  props: ConditionalClaimFieldsProps,
) {
  const { values, onChange, idPrefix, isTh } = props;
  const key = f.key as ClaimFieldKey;
  const value = values[key] ?? '';
  const label = CONDITIONAL_CLAIM_LABELS[f.key]
    ? (isTh ? CONDITIONAL_CLAIM_LABELS[f.key].th : CONDITIONAL_CLAIM_LABELS[f.key].en)
    : f.key;
  const fieldId = `${idPrefix}-${f.key}`;
  const infoOnly = f.infoOnlyOptionIds ?? [];
  // STA-145 Phase B — conditional Mandatory marker (requiredIf ?? required).
  const required = isClaimFieldRequired(f, values);

  if (f.type === 'select' && f.lov) {
    return (
      <FormField key={fieldId} id={fieldId} label={label} required={required}>
        {(controlProps) => (
          <select
            {...controlProps}
            className={selectClassName}
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
          >
            <option value="">{isTh ? '— เลือก —' : '— Select —'}</option>
            {f.lov!.map((opt) => (
              <option key={opt.id} value={opt.id} disabled={infoOnly.includes(opt.id)}>
                {pickLabel(opt, isTh ? 'th' : 'en')}
              </option>
            ))}
          </select>
        )}
      </FormField>
    );
  }
  if (f.type === 'textarea') {
    return (
      <FormField key={fieldId} id={fieldId} label={label} required={required}>
        {(controlProps) => (
          <Textarea
            {...controlProps}
            value={value}
            maxLength={f.maxLength}
            onChange={(e) => onChange(key, e.target.value)}
          />
        )}
      </FormField>
    );
  }
  const inputType = f.type === 'date' ? 'date' : f.type === 'month' ? 'month' : 'text';
  return (
    <FormField key={fieldId} id={fieldId} label={label} required={required}>
      {(controlProps) => (
        <FormInput
          {...controlProps}
          type={inputType}
          inputMode={f.type === 'number' ? 'numeric' : undefined}
          maxLength={f.type === 'text' ? f.maxLength : undefined}
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
      )}
    </FormField>
  );
}

export function ConditionalClaimFields(props: ConditionalClaimFieldsProps) {
  // STA-145 Phase B — drop fields whose showIf predicate is false this render.
  const visible = props.fields.filter((f) => isClaimFieldVisible(f, props.values));
  return <>{visible.map((f) => renderField(f, props))}</>;
}
