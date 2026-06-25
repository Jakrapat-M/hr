'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Button, Card, CardEyebrow, CardTitle, FormField, FormInput, Textarea } from '@/components/humi';
import { Modal } from '@/components/humi/Modal';
import { FileUploadField } from '@/components/humi/FileUploadField';
import type { BenefitPlan } from '@/data/benefits/plan-registry';
import {
  bucketsForPlan,
  getConditionalFields,
  isClaimFieldRequired,
  type ClaimFieldKey,
} from '@/data/benefits/claim-field-config';
import { ConditionalClaimFields } from './ConditionalClaimFields';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BenefitTemplateProps {
  plan: BenefitPlan;
  onSubmitted?: (workflowRequestId: string, submission?: SimpleClaimSubmission) => void;
  defaultEmployeeId?: string;
  className?: string;
  selectedBenefitLabel?: string;
  remainingAmount?: number;
  /** Popup-local monthly limit (STA-120) — shown below the annual-limit line when present. */
  monthlyLimitThb?: number;
}

export interface SimpleClaimSubmission {
  selectedBenefit: string;
  benefitCode: string;
  claimDate: string;
  receiptDate?: string;
  remainingAmount?: number;
  receiptNo: string;
  receiptAmount: number;
  totalClaimAmount: number;
  remark: string;
  currency: string;
  /** Conditional values keyed by descriptor key; selects carry option ids. */
  dynamicFields: Partial<Record<ClaimFieldKey, string | number>>;
}

// ── SimpleClaimForm ───────────────────────────────────────────────────────────
// Template: simple-claim. Field membership is config-driven (STA-119):
// general group + the conditional groups for the plan's category bucket.

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

// Bilingual field labels — mirrors messages/{th,en}.json `benefits.claim.*`
// (kept in sync by the i18n parity test). Inline here to match the other
// benefit templates (HospitalClaimForm etc.) and the test's next-intl mock.
const CLAIM_LABELS: Record<string, { th: string; en: string }> = {
  selectedBenefit: { th: 'สวัสดิการที่เลือก', en: 'Selected Benefit' },
  claimDate: { th: 'วันที่เคลม', en: 'Claim Date' },
  remainingAmount: { th: 'วงเงินคงเหลือ', en: 'Remaining Amount' },
  currency: { th: 'สกุลเงิน', en: 'Currency' },
  receiptNo: { th: 'เลขที่ใบเสร็จ/เอกสาร', en: 'Receipt / doc no.' },
  receiptDate: { th: 'วันที่ใบเสร็จ', en: 'Receipt Date' },
  receiptAmount: { th: 'จำนวนเงินตามใบเสร็จ (บาท)', en: 'Receipt amount (THB)' },
  totalClaimAmount: { th: 'ยอดเบิกสุทธิ (บาท)', en: 'Total Claim Amount (THB)' },
  remark: { th: 'หมายเหตุ', en: 'Remark' },
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

export function SimpleClaimForm({
  plan,
  onSubmitted,
  className,
  selectedBenefitLabel,
  remainingAmount,
  monthlyLimitThb,
}: BenefitTemplateProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const tc = (key: string) => {
    const entry = CLAIM_LABELS[key];
    return entry ? (isTh ? entry.th : entry.en) : key;
  };

  const planName = selectedBenefitLabel ?? (isTh ? plan.nameTh : plan.nameEn);
  const requiredDocs = isTh ? plan.requiredDocsTh : plan.requiredDocsEn;
  const visibleRemainingAmount = remainingAmount ?? plan.annualLimitThb ?? undefined;

  const conditionalFields = getConditionalFields(bucketsForPlan(plan));

  const emptyDynamic = (): Partial<Record<ClaimFieldKey, string>> => ({});

  const [form, setForm] = useState({
    claimDate: todayIsoDate(),
    receiptDate: '',
    receiptNo: '',
    receiptAmount: '',
    claimAmount: '',
    remark: '',
    attachmentName: '',
  });
  // Conditional values live here so switching benefit can clear them wholesale.
  const [dynamic, setDynamic] = useState<Partial<Record<ClaimFieldKey, string>>>(emptyDynamic);
  const [errors, setErrors] = useState<string[]>([]);
  const [lastWorkflowId, setLastWorkflowId] = useState<string | null>(null);
  // STA-145 Phase B — patient-transfer "Yes" opens an error popup that asks the
  // claimant to close + cancel (E-patient reconciles outside Humi).
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  // STA-148 req-2 — selecting Type of Hospital = Clinic opens a not-allowed notice.
  const [clinicModalOpen, setClinicModalOpen] = useState(false);

  const resetForm = () => {
    setForm({
      claimDate: todayIsoDate(),
      receiptDate: '',
      receiptNo: '',
      receiptAmount: '',
      claimAmount: '',
      remark: '',
      attachmentName: '',
    });
    setDynamic(emptyDynamic());
    setErrors([]);
  };

  // Reset conditional values whenever the selected benefit (plan) changes.
  const [planKey, setPlanKey] = useState(plan.id);
  if (planKey !== plan.id) {
    setPlanKey(plan.id);
    setDynamic(emptyDynamic());
    setForm((prev) => ({ ...prev, claimAmount: '' }));
  }

  const clearTransient = () => {
    if (errors.length > 0) setErrors([]);
    if (lastWorkflowId) setLastWorkflowId(null);
  };

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // STA-120 3.2a — Total Claim Amount mirrors Receipt Amount on input,
      // capped at the remaining amount (STA-120 3.2b, clamp, NO-RED).
      if (field === 'receiptAmount') {
        next.claimAmount = capToRemaining(value);
      }
      return next;
    });
    clearTransient();
  };

  const capToRemaining = (raw: string): string => {
    const n = Number(raw);
    if (!Number.isFinite(n) || raw.trim() === '') return raw;
    if (visibleRemainingAmount !== undefined && n > visibleRemainingAmount) {
      return String(visibleRemainingAmount);
    }
    return raw;
  };

  const setTotal = (value: string) => {
    setForm((prev) => ({ ...prev, claimAmount: capToRemaining(value) }));
    clearTransient();
  };

  const setDynamicField = (key: ClaimFieldKey, value: string) => {
    setDynamic((prev) => ({ ...prev, [key]: value }));
    clearTransient();
    // STA-145 Phase B — selecting patient-transfer = Yes pops the E-patient notice.
    if (key === 'patientTransferDoc' && value === 'yes') {
      setTransferModalOpen(true);
    }
    // STA-148 req-2 — selecting Type of Hospital = Clinic is not claimable.
    if (key === 'hospitalType' && value === 'clinic') {
      setClinicModalOpen(true);
    }
  };

  // STA-148 req-2 — on closing the clinic notice, clear the Clinic selection so
  // the user must pick a valid hospital type.
  const closeClinicModal = () => {
    setClinicModalOpen(false);
    setDynamic((prev) => ({ ...prev, hospitalType: '' }));
  };

  const totalCapped =
    visibleRemainingAmount !== undefined &&
    Number(form.claimAmount) === visibleRemainingAmount &&
    Number(form.receiptAmount) > visibleRemainingAmount;

  const submit = () => {
    const nextErrors: string[] = [];
    if (!form.receiptNo.trim()) {
      nextErrors.push(isTh ? 'กรุณาระบุเลขที่ใบเสร็จ' : 'Receipt number is required');
    }
    if (!form.claimDate) {
      nextErrors.push(isTh ? 'กรุณาระบุวันที่เคลม' : 'Claim date is required');
    }
    const amount = Number(form.receiptAmount);
    const claimAmount = Number(form.claimAmount || form.receiptAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      nextErrors.push(isTh ? 'กรุณาระบุจำนวนเงินตามใบเสร็จ' : 'Receipt amount is required');
    }
    if (!Number.isFinite(claimAmount) || claimAmount <= 0) {
      nextErrors.push(isTh ? 'กรุณาระบุยอดเบิกสุทธิ' : 'Total claim amount is required');
    }
    // Required conditional fields (STA-145 Phase B — honor requiredIf + skip
    // hidden showIf===false fields so conditional-required fields gate submit).
    conditionalFields.forEach((f) => {
      if (
        isClaimFieldRequired(f, dynamic) &&
        !String(dynamic[f.key as ClaimFieldKey] ?? '').trim()
      ) {
        nextErrors.push((isTh ? 'กรุณาระบุ' : 'Required: ') + tc(f.labelKey));
      }
    });
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }
    const wfId = `WF-${Date.now()}`;
    setLastWorkflowId(wfId);
    const submittedDynamic = { ...dynamic } as Partial<Record<ClaimFieldKey, string | number>>;
    const submittedClaimDate = form.claimDate;
    const submittedReceiptDate = form.receiptDate || undefined;
    setForm({
      claimDate: todayIsoDate(),
      receiptDate: '',
      receiptNo: '',
      receiptAmount: '',
      claimAmount: '',
      remark: '',
      attachmentName: '',
    });
    setDynamic(emptyDynamic());
    setErrors([]);
    onSubmitted?.(wfId, {
      selectedBenefit: planName,
      benefitCode: plan.id,
      claimDate: submittedClaimDate,
      receiptDate: submittedReceiptDate,
      remainingAmount: visibleRemainingAmount,
      receiptNo: form.receiptNo.trim(),
      receiptAmount: amount,
      totalClaimAmount: claimAmount,
      remark: form.remark.trim(),
      currency: 'THB',
      dynamicFields: submittedDynamic,
    });
  };

  return (
    <Card variant="raised" size="lg" className={className}>
      <CardEyebrow>{isTh ? 'เบิกสวัสดิการ · ใบเสร็จ' : 'Benefit claim · receipt-based'}</CardEyebrow>
      <CardTitle>{planName}</CardTitle>
      <p className="mt-2 text-small text-ink-muted">{plan.eligibilityTh}</p>

      {plan.annualLimitThb !== null && (
        <p className="mt-1 text-small font-medium text-accent">
          {isTh ? `วงเงินรายปี: ${plan.annualLimitThb.toLocaleString()} บาท` : `Annual limit: ${plan.annualLimitThb.toLocaleString()} THB`}
        </p>
      )}
      {monthlyLimitThb != null && (
        <p className="mt-1 text-small font-medium text-accent">
          {isTh ? `วงเงินรายเดือน: ${monthlyLimitThb.toLocaleString()} บาท` : `Monthly limit: ${monthlyLimitThb.toLocaleString()} THB`}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* ── General group ──────────────────────────────────────────────── */}
        <FormField id={`${plan.id}-selected-benefit`} label={tc('selectedBenefit')}>
          {(controlProps) => (
            <FormInput {...controlProps} readOnly value={planName} />
          )}
        </FormField>

        {/* STA-120 3.1 — Claim Date is a read-only display of today's date. */}
        <FormField id={`${plan.id}-claim-date`} label={tc('claimDate')} required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              readOnly
              value={new Date(form.claimDate).toLocaleDateString(isTh ? 'th-TH' : 'en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          )}
        </FormField>

        <FormField id={`${plan.id}-remaining-amount`} label={tc('remainingAmount')}>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              readOnly
              value={
                visibleRemainingAmount === undefined
                  ? (isTh ? 'ตรวจสอบตามเงื่อนไขสวัสดิการ' : 'Checked by benefit rules')
                  : `฿${visibleRemainingAmount.toLocaleString('th-TH')}`
              }
            />
          )}
        </FormField>

        <FormField id={`${plan.id}-currency`} label={tc('currency')}>
          {(controlProps) => (
            <FormInput {...controlProps} readOnly value="THB" />
          )}
        </FormField>

        <FormField id={`${plan.id}-receipt-no`} label={tc('receiptNo')} required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              value={form.receiptNo}
              onChange={(e) => setField('receiptNo', e.target.value)}
              placeholder={isTh ? 'เช่น RC-2026-0001' : 'e.g. RC-2026-0001'}
            />
          )}
        </FormField>

        <FormField id={`${plan.id}-receipt-date`} label={tc('receiptDate')}>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              type="date"
              value={form.receiptDate}
              onChange={(e) => setField('receiptDate', e.target.value)}
            />
          )}
        </FormField>

        <FormField id={`${plan.id}-receipt-amount`} label={tc('receiptAmount')} required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              inputMode="numeric"
              value={form.receiptAmount}
              onChange={(e) => setField('receiptAmount', e.target.value)}
            />
          )}
        </FormField>

        <FormField
          id={`${plan.id}-claim-amount`}
          label={tc('totalClaimAmount')}
          help={isTh ? 'เติมอัตโนมัติจากยอดใบเสร็จ' : 'Auto-filled from receipt amount'}
          error={totalCapped ? (isTh ? 'ปรับลงเหลือเท่าวงเงินคงเหลือ' : 'Capped at remaining amount') : undefined}
        >
          {(controlProps) => (
            <FormInput
              {...controlProps}
              inputMode="numeric"
              value={form.claimAmount}
              onChange={(e) => setTotal(e.target.value)}
            />
          )}
        </FormField>

        {/* ── Conditional groups (config-driven, shared renderer) ────────── */}
        <ConditionalClaimFields
          fields={conditionalFields}
          values={dynamic}
          onChange={setDynamicField}
          idPrefix={plan.id}
          isTh={isTh}
        />

        {/* STA-148 req-3 — Remark relocated to the last field before Attachments. */}
        <FormField id={`${plan.id}-remark`} label={tc('remark')} className="sm:col-span-2">
          {(controlProps) => (
            <Textarea
              {...controlProps}
              value={form.remark}
              onChange={(e) => setField('remark', e.target.value)}
              placeholder={isTh ? 'ระบุรายละเอียดเพิ่มเติมถึง SPD' : 'Add notes for SPD'}
            />
          )}
        </FormField>

        {/* STA-148 req-1 — Certification notice above Attachments, all claim types.
            NO-RED: Tan asked for "red"; rendered in pumpkin --color-danger per the
            design system (flagged to BA). */}
        <p className="sm:col-span-2 text-small font-medium text-[var(--color-danger)]">
          {isTh
            ? 'ข้าพเจ้าขอรับรองว่าข้อมูลข้างต้นถูกต้องและครบถ้วน'
            : 'I hereby certify that the above information is accurate and complete'}
        </p>

        <FileUploadField
          label={isTh ? 'เอกสารแนบ' : 'Attachments'}
          required
          maxFiles={5}
          helperText={requiredDocs.length > 0 ? requiredDocs.join(' · ') : undefined}
          className="sm:col-span-2"
          onUpload={(_, file) => setField('attachmentName', file?.filename ?? '')}
          onRemove={() => setField('attachmentName', '')}
        />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mt-4 rounded-[var(--radius-md)] bg-danger-soft p-3 text-small text-ink">
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {lastWorkflowId && (
        <div role="status" className="mt-4 rounded-[var(--radius-md)] bg-success-soft p-3 text-small font-medium text-ink">
          {isTh ? `ส่งคำขอ ${lastWorkflowId} แล้ว · ติดตามได้ที่ /requests` : `Submitted ${lastWorkflowId} · track at /requests`}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={submit}>
          {isTh ? 'ส่งคำขอเบิกสวัสดิการ' : 'Submit claim'}
        </Button>
      </div>

      {/* STA-145 Phase B — patient-transfer (E-patient) notice. NO-RED: pumpkin
          --color-danger accent, never red. */}
      <Modal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={isTh ? 'ข้อผิดพลาด' : 'Error'}
      >
        {/* Flush pumpkin accent bar (NO-RED danger token), breaks out of the
            Modal body padding. */}
        <div className="-mx-6 -mt-5 mb-4 h-1 bg-[var(--color-danger)]" aria-hidden />
        <div className="space-y-3 text-body text-ink">
          <p>
            {isTh
              ? 'กรณีใช้สิทธิ E-patient ไม่ต้องเบิกผ่าน Humi ยอดวงเงินค่ารักษาพยาบาลของคุณจะถูกปรับปรุงหลังกระทบยอดกับใบเสร็จจากโรงพยาบาล'
              : 'In case of using E-patient, reimbursement via Humi is not required. Your medical balance will be updated after reconciliation with the receipt from hospital.'}
          </p>
          <p>
            {isTh
              ? "กรุณากด 'ปิด' แล้ว 'ยกเลิก' คำขอนี้"
              : "Please press 'Close' and 'Cancel' this claim."}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTransferModalOpen(false)}>
              {isTh ? 'ปิด' : 'Close'}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setTransferModalOpen(false);
                resetForm();
              }}
            >
              {isTh ? 'ยกเลิกคำขอนี้' : 'Cancel this claim'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* STA-148 req-2 — Clinic not-allowed notice. NO-RED: pumpkin accent. */}
      <Modal
        open={clinicModalOpen}
        onClose={closeClinicModal}
        title={isTh ? 'ข้อผิดพลาด' : 'Error'}
      >
        <div className="-mx-6 -mt-5 mb-4 h-1 bg-[var(--color-danger)]" aria-hidden />
        <div className="space-y-3 text-body text-ink">
          <p>
            {isTh
              ? 'ไม่สามารถเบิกค่าใช้จ่ายจากคลินิก (Clinic) ได้ กรุณาติดต่อผู้ดูแลระบบ'
              : 'You are not allowed to claim receipt from คลินิค(Clinic). Please contact you administrator'}
          </p>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" onClick={closeClinicModal}>
              {isTh ? 'ปิด' : 'Close'}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
