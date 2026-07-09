'use client';

import { useState } from 'react';
import { Button, Card, CardEyebrow, CardTitle, FormField, FormInput } from '@/components/cnext';
import { THAI_TAX_YEAR_ASSUMPTIONS, formatTHB, type TaxAllowanceInput } from '@/lib/tax-planning';
import {
  EMPTY_TAX_ALLOWANCES,
  TAX_PLANNING_STATUS_LABEL,
  selectTaxPlanningSafeSummary,
  useBenefitTaxPlanningStore,
  type TaxPlanningStatus,
} from '@/stores/benefit-tax-planning';

const allowanceLabels: Array<[keyof TaxAllowanceInput, string]> = [
  ['spouse', 'คู่สมรส'],
  ['children', 'บุตร'],
  ['parents', 'บิดามารดา'],
  ['disability', 'ผู้พิการ'],
  ['lifeInsurance', 'ประกันชีวิต'],
  ['providentFund', 'กองทุนสำรองเลี้ยงชีพ'],
  ['retirementFund', 'กองทุนเกษียณ / RMF / SSF'],
  ['socialSecurity', 'ประกันสังคม'],
  ['donations', 'เงินบริจาค'],
  ['other', 'ค่าลดหย่อนอื่น ๆ'],
];

const terminalStatuses: TaxPlanningStatus[] = ['approved', 'rejected', 'cancelled'];

export function TaxPlanningPanel() {
  const profile = useBenefitTaxPlanningStore((state) => state.profile);
  const drafts = useBenefitTaxPlanningStore((state) => state.drafts);
  const saveDraft = useBenefitTaxPlanningStore((state) => state.saveDraft);
  const estimateDraft = useBenefitTaxPlanningStore((state) => state.estimateDraft);
  const submitForPayrollReview = useBenefitTaxPlanningStore((state) => state.submitTaxPlanningForPayrollReview);
  const resubmitForPayrollReview = useBenefitTaxPlanningStore((state) => state.resubmitTaxPlanningForPayrollReview);
  const cancelReview = useBenefitTaxPlanningStore((state) => state.cancelTaxPlanningReview);
  const summary = selectTaxPlanningSafeSummary({ profile, drafts });
  const latest = drafts[0];
  const [expectedAdditionalIncome, setExpectedAdditionalIncome] = useState(String(latest?.expectedAdditionalIncome ?? 0));
  const [allowances, setAllowances] = useState<TaxAllowanceInput>(latest?.allowances ?? EMPTY_TAX_ALLOWANCES);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = latest ? terminalStatuses.includes(latest.status) : false;
  const isSubmitted = latest ? ['submitted_payroll', 'payroll_reviewing'].includes(latest.status) : false;
  const canEdit = !isTerminal && !isSubmitted;
  const canSubmit = latest?.status === 'estimated' && !!latest.estimate;
  const hasSendBackHistory = latest?.audit.some((entry) => entry.action === 'send_back') ?? false;
  const submitLabel = hasSendBackHistory ? 'ส่งแผนให้ Payroll อีกครั้ง' : 'ส่งให้ Payroll ตรวจแผน';

  const updateAllowance = (key: keyof TaxAllowanceInput, value: string) => {
    setAllowances((prev) => ({ ...prev, [key]: Number(value || 0) }));
    setError(null);
  };

  const calculate = () => {
    try {
      const draft = saveDraft({ expectedAdditionalIncome: Number(expectedAdditionalIncome || 0), allowances });
      estimateDraft(draft.id);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถคำนวณประมาณการภาษี');
    }
  };

  const save = () => {
    try {
      saveDraft({ expectedAdditionalIncome: Number(expectedAdditionalIncome || 0), allowances });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถบันทึกร่างแผนภาษี');
    }
  };

  const submit = () => {
    if (!latest) return;
    try {
      if (hasSendBackHistory) {
        resubmitForPayrollReview(latest.id);
      } else {
        submitForPayrollReview(latest.id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถส่งแผนภาษีให้ Payroll ตรวจ');
    }
  };

  const cancel = () => {
    if (!latest) return;
    try {
      cancelReview(latest.id, { role: 'employee', name: profile.employeeName }, 'พนักงานยกเลิกคำขอตรวจแผนภาษี');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถยกเลิกคำขอตรวจแผนภาษี');
    }
  };

  return (
    <Card variant="raised" size="lg">
      <CardEyebrow>Tax planning · Payroll review-ready estimate</CardEyebrow>
      <CardTitle>วางแผนภาษีปี {profile.taxYear}</CardTitle>
      <p className="mt-2 text-small text-ink-muted">
        ประมาณการส่วนตัวเพื่อวางแผน ไม่ใช่คำแนะนำภาษี การส่งให้ Payroll เป็นการตรวจเพื่อวางแผนเท่านั้น ไม่อัปเดตเงินเดือน ไม่ยื่นภาษี และไม่ส่งข้อมูลให้ SPD
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Summary label="Tax ID" value={profile.maskedTaxId} />
        <Summary label="YTD income" value={formatTHB(profile.ytdIncome)} />
        <Summary label="YTD withholding" value={formatTHB(profile.ytdWithholding)} />
        <Summary label="Social security" value={formatTHB(profile.socialSecurityYtd)} />
      </div>

      {latest && (
        <div className="mt-4 rounded-md bg-canvas-soft p-3 text-small text-ink-muted" aria-live="polite">
          สถานะ: <span className="font-semibold text-ink">{TAX_PLANNING_STATUS_LABEL[latest.status]}</span>
          {latest.workflowRequestId ? <span> · Workflow {latest.workflowRequestId}</span> : null}
          {latest.correctionReason ? <p className="mt-1 text-ink">เหตุผลที่ Payroll ส่งกลับ: {latest.correctionReason}</p> : null}
          {latest.rejectionReason ? <p className="mt-1 text-ink">เหตุผลที่ Payroll ไม่รับแผน: {latest.rejectionReason}</p> : null}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-disabled={!canEdit}>
        <FormField id="tax-expected-additional-income" label="รายได้เพิ่มเติมคาดการณ์ทั้งปี" help="ใส่เฉพาะรายได้ที่คาดว่าจะเพิ่มจากยอด YTD">
          {(controlProps) => (
            <FormInput
              {...controlProps}
              inputMode="numeric"
              value={expectedAdditionalIncome}
              disabled={!canEdit}
              onChange={(event) => { setExpectedAdditionalIncome(event.target.value); setError(null); }}
            />
          )}
        </FormField>
        {allowanceLabels.map(([key, label]) => (
          <FormField
            key={key}
            id={`tax-allowance-${key}`}
            label={label}
            help={`วงเงินสูงสุด ${formatTHB(THAI_TAX_YEAR_ASSUMPTIONS.caps[key])}`}
          >
            {(controlProps) => (
              <FormInput
                {...controlProps}
                inputMode="numeric"
                value={allowances[key]}
                disabled={!canEdit}
                onChange={(event) => updateAllowance(key, event.target.value)}
              />
            )}
          </FormField>
        ))}
      </div>

      {error && <div role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-small text-ink">{error}</div>}

      {summary.latestEstimate && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4" aria-label="tax estimate summary">
          <Summary label="Gross annual income" value={formatTHB(summary.latestEstimate.grossAnnualIncome)} />
          <Summary label="Total deductions" value={formatTHB(summary.latestEstimate.totalDeductions)} />
          <Summary label="Taxable income" value={formatTHB(summary.latestEstimate.taxableIncome)} />
          <Summary label="Estimated tax" value={formatTHB(summary.latestEstimate.estimatedTax)} />
          <Summary label="Remaining due" value={formatTHB(summary.latestEstimate.remainingDue)} />
          <Summary label="Potential refund" value={formatTHB(summary.latestEstimate.refund)} />
        </div>
      )}

      <div className="mt-4 rounded-md bg-canvas-soft p-3 text-small text-ink-muted">
        สมมติฐาน: ค่าลดหย่อนส่วนตัว {formatTHB(THAI_TAX_YEAR_ASSUMPTIONS.personalAllowance)}, ค่าใช้จ่ายหักได้สูงสุด {formatTHB(THAI_TAX_YEAR_ASSUMPTIONS.expenseDeductionCap)}, อัตราภาษีเงินได้บุคคลธรรมดาตามปีภาษีที่เลือก โปรดตรวจสอบกับ Payroll/Finance ก่อนตัดสินใจจริง
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={save} disabled={!canEdit}>บันทึกร่าง</Button>
        <Button variant="primary" onClick={calculate} disabled={!canEdit}>คำนวณประมาณการ</Button>
        <Button variant="ghost" onClick={submit} disabled={!canSubmit}>{submitLabel}</Button>
        <Button variant="ghost" onClick={cancel} disabled={!latest || isTerminal}>ยกเลิกคำขอตรวจแผน</Button>
      </div>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-canvas-soft p-3"><div className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</div><div className="mt-1 font-semibold text-ink">{value}</div></div>;
}
