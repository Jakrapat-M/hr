'use client';

import { useState } from 'react';
import { Button, Card, CardEyebrow, CardTitle } from '@/components/humi';
import { THAI_TAX_YEAR_ASSUMPTIONS, formatTHB, type TaxAllowanceInput } from '@/lib/tax-planning';
import { EMPTY_TAX_ALLOWANCES, selectTaxPlanningSafeSummary, useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

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

export function TaxPlanningPanel() {
  const profile = useBenefitTaxPlanningStore((state) => state.profile);
  const drafts = useBenefitTaxPlanningStore((state) => state.drafts);
  const saveDraft = useBenefitTaxPlanningStore((state) => state.saveDraft);
  const estimateDraft = useBenefitTaxPlanningStore((state) => state.estimateDraft);
  const summary = selectTaxPlanningSafeSummary({ profile, drafts });
  const latest = drafts[0];
  const [expectedAdditionalIncome, setExpectedAdditionalIncome] = useState(String(latest?.expectedAdditionalIncome ?? 0));
  const [allowances, setAllowances] = useState<TaxAllowanceInput>(latest?.allowances ?? EMPTY_TAX_ALLOWANCES);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Card variant="raised" size="lg">
      <CardEyebrow>Tax planning · local estimator only</CardEyebrow>
      <CardTitle>วางแผนภาษีปี {profile.taxYear}</CardTitle>
      <p className="mt-2 text-small text-ink-muted">ประมาณการเพื่อวางแผน ไม่ใช่คำแนะนำภาษี และยังไม่ส่งให้ payroll/SPD review ใน MVP</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Summary label="Tax ID" value={profile.maskedTaxId} />
        <Summary label="YTD income" value={formatTHB(profile.ytdIncome)} />
        <Summary label="YTD withholding" value={formatTHB(profile.ytdWithholding)} />
        <Summary label="Social security" value={formatTHB(profile.socialSecurityYtd)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="humi-label">รายได้เพิ่มเติมคาดการณ์ทั้งปี
          <input className="humi-input mt-1" inputMode="numeric" value={expectedAdditionalIncome} onChange={(event) => { setExpectedAdditionalIncome(event.target.value); setError(null); }} />
        </label>
        {allowanceLabels.map(([key, label]) => (
          <label key={key} className="humi-label">{label} <span className="text-ink-muted">(cap {formatTHB(THAI_TAX_YEAR_ASSUMPTIONS.caps[key])})</span>
            <input className="humi-input mt-1" inputMode="numeric" value={allowances[key]} onChange={(event) => updateAllowance(key, event.target.value)} />
          </label>
        ))}
      </div>

      {error && <div role="alert" className="mt-4 rounded-md bg-danger-tint p-3 text-small text-ink">{error}</div>}

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
        Assumptions: personal allowance {formatTHB(THAI_TAX_YEAR_ASSUMPTIONS.personalAllowance)}, expense deduction capped at {formatTHB(THAI_TAX_YEAR_ASSUMPTIONS.expenseDeductionCap)}, Thai PIT brackets mocked for planning. โปรดตรวจสอบกับ payroll/finance ก่อนตัดสินใจจริง
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => saveDraft({ expectedAdditionalIncome: Number(expectedAdditionalIncome || 0), allowances })}>บันทึกร่าง</Button>
        <Button variant="primary" onClick={calculate}>คำนวณประมาณการ</Button>
        <Button variant="ghost" disabled>Submit for review planned</Button>
      </div>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md bg-canvas-soft p-3"><div className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">{label}</div><div className="mt-1 font-semibold text-ink">{value}</div></div>;
}
