'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Button, Card, CardEyebrow, CardTitle, FormField, FormInput } from '@/components/humi';
import { Capability } from '@/components/humi';
import type { BenefitPlan } from '@/data/benefits/plan-registry';
import type { BenefitTemplateProps } from './SimpleClaimForm';
import { ApprovalChain } from '@/components/quick-approve/ApprovalChain';

const selectClassName =
  'h-10 w-full rounded-[var(--radius-md)] border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas';

// ── LifecycleAdminForm ────────────────────────────────────────────────────────
// Template: lifecycle-admin
// Use cases: BE-CYC-001..005 — annual enrollment, on/off-boarding, payment cycle
// Admin-only batch op: cycle period, scope (employee group, BU), preview count.
// Action buttons: Run / Validate / Cancel — gated by editFoundation capability.

export function LifecycleAdminForm({
  plan,
  onSubmitted,
  className,
}: BenefitTemplateProps) {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const planName = isTh ? plan.nameTh : plan.nameEn;

  const [form, setForm] = useState({
    periodStart: '',
    periodEnd: '',
    employeeGroup: '',
    businessUnit: '',
    scope: 'all' as 'all' | 'group' | 'bu',
  });
  const [previewCount, setPreviewCount] = useState<number | null>(null); // mock: null until Validate
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
    if (lastAction) setLastAction(null);
  };

  const validateForm = (): string[] => {
    const errs: string[] = [];
    if (!form.periodStart) errs.push(isTh ? 'กรุณาระบุวันเริ่มต้นรอบ' : 'Period start date is required');
    if (!form.periodEnd) errs.push(isTh ? 'กรุณาระบุวันสิ้นสุดรอบ' : 'Period end date is required');
    if (form.scope === 'group' && !form.employeeGroup.trim()) {
      errs.push(isTh ? 'กรุณาระบุกลุ่มพนักงาน' : 'Employee group is required');
    }
    if (form.scope === 'bu' && !form.businessUnit.trim()) {
      errs.push(isTh ? 'กรุณาระบุหน่วยธุรกิจ' : 'Business unit is required');
    }
    return errs;
  };

  const handleValidate = () => {
    const errs = validateForm();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    // Mock: would call API to preview count
    setPreviewCount(147);
    setLastAction(isTh ? 'ตรวจสอบแล้ว · พบพนักงาน 147 ราย (ตัวอย่าง)' : 'Validated · 147 employees in scope (mock)');
  };

  const handleRun = () => {
    const errs = validateForm();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    const wfId = `WF-${Date.now()}`;
    setLastAction(isTh ? `รันแล้ว · ${wfId}` : `Run queued · ${wfId}`);
    onSubmitted?.(wfId);
  };

  const handleCancel = () => {
    setForm({ periodStart: '', periodEnd: '', employeeGroup: '', businessUnit: '', scope: 'all' });
    setErrors([]);
    setLastAction(null);
  };

  return (
    <Card variant="raised" size="lg" className={className}>
      <CardEyebrow>{isTh ? 'งานสวัสดิการ · แอดมินเท่านั้น' : 'Benefit lifecycle · admin only'}</CardEyebrow>
      <CardTitle>{planName}</CardTitle>
      <p className="mt-2 text-small text-ink-muted">{plan.eligibilityTh}</p>

      {/* Header summary card */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField id={`${plan.id}-period-start`} label={isTh ? 'วันเริ่มต้นรอบ' : 'Period start'} required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              type="date"
              value={form.periodStart}
              onChange={(e) => setField('periodStart', e.target.value)}
            />
          )}
        </FormField>

        <FormField id={`${plan.id}-period-end`} label={isTh ? 'วันสิ้นสุดรอบ' : 'Period end'} required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              type="date"
              value={form.periodEnd}
              onChange={(e) => setField('periodEnd', e.target.value)}
            />
          )}
        </FormField>

        {/* Scope selector */}
        <FormField id={`${plan.id}-scope`} label={isTh ? 'ขอบเขต' : 'Scope'} required>
          {(controlProps) => (
            <select
              {...controlProps}
              className={selectClassName}
              value={form.scope}
              onChange={(e) => setField('scope', e.target.value)}
            >
              <option value="all">{isTh ? 'พนักงานทั้งหมด' : 'All employees'}</option>
              <option value="group">{isTh ? 'กลุ่มพนักงาน' : 'Employee group'}</option>
              <option value="bu">{isTh ? 'หน่วยธุรกิจ' : 'Business unit'}</option>
            </select>
          )}
        </FormField>

        {/* Conditional: employee group */}
        {form.scope === 'group' && (
          <FormField id={`${plan.id}-employee-group`} label={isTh ? 'กลุ่มพนักงาน' : 'Employee group'} required>
            {(controlProps) => (
              <FormInput
                {...controlProps}
                value={form.employeeGroup}
                onChange={(e) => setField('employeeGroup', e.target.value)}
                placeholder={isTh ? 'เช่น พนักงานระดับ M3' : 'e.g. Grade M3'}
              />
            )}
          </FormField>
        )}

        {/* Conditional: business unit */}
        {form.scope === 'bu' && (
          <FormField id={`${plan.id}-business-unit`} label={isTh ? 'หน่วยธุรกิจ' : 'Business unit'} required>
            {(controlProps) => (
              <FormInput
                {...controlProps}
                value={form.businessUnit}
                onChange={(e) => setField('businessUnit', e.target.value)}
                placeholder={isTh ? 'เช่น People Operations' : 'e.g. People Operations'}
              />
            )}
          </FormField>
        )}

        {/* Preview count */}
        {previewCount !== null && (
          <div className="sm:col-span-2 rounded-[var(--radius-md)] bg-accent-soft px-4 py-3">
            <p className="text-small font-medium text-accent">
              {isTh ? `พบพนักงานในขอบเขต: ${previewCount} ราย` : `Employees in scope: ${previewCount}`}
            </p>
          </div>
        )}
      </div>

      {/* Approval chain */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft p-3">
        <p className="mb-2 text-small font-medium text-ink">
          {isTh ? 'ขั้นตอนอนุมัติ' : 'Approval chain'}
        </p>
        <ApprovalChain chain={plan.approvalChain} locale={locale} />
      </div>

      {errors.length > 0 && (
        <div role="alert" className="mt-4 rounded-[var(--radius-md)] bg-danger-soft p-3 text-small text-ink">
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      {lastAction && (
        <div role="status" className="mt-4 rounded-[var(--radius-md)] bg-success-soft p-3 text-small font-medium text-ink">
          {lastAction}
        </div>
      )}

      {/* Action buttons — all gated by editFoundation */}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Capability action="editFoundation" fallback={
          <>
            <Button variant="ghost" disabled>{isTh ? 'ยกเลิก' : 'Cancel'}</Button>
            <Button variant="secondary" disabled>{isTh ? 'ตรวจสอบ' : 'Validate'}</Button>
            <Button variant="primary" disabled>{isTh ? 'รัน' : 'Run'}</Button>
          </>
        }>
          <Button variant="ghost" onClick={handleCancel}>
            {isTh ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button variant="secondary" onClick={handleValidate}>
            {isTh ? 'ตรวจสอบ' : 'Validate'}
          </Button>
          <Button variant="primary" onClick={handleRun}>
            {isTh ? 'รัน' : 'Run'}
          </Button>
        </Capability>
      </div>
    </Card>
  );
}
