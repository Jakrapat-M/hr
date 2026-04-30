'use client';

import { useState } from 'react';
import { Button, Card, CardEyebrow, CardTitle, FormField, FormInput } from '@/components/humi';
import { validateBenefitReferralInput, useBenefitReferralsStore } from '@/stores/benefit-referrals';

export function ReferralRequestPanel({ onSubmitted }: { onSubmitted?: (workflowRequestId: string) => void }) {
  const hospitals = useBenefitReferralsStore((state) => state.hospitals);
  const coveredPeople = useBenefitReferralsStore((state) => state.coveredPeople);
  const createReferral = useBenefitReferralsStore((state) => state.createReferral);
  const submitReferral = useBenefitReferralsStore((state) => state.submitReferral);
  const [form, setForm] = useState({
    coveredPersonId: coveredPeople[0]?.id ?? '',
    hospitalId: hospitals[0]?.id ?? '',
    serviceReason: '',
    preferredVisitDate: '',
    contactPhone: '080-000-0001',
    documentNote: '',
    notes: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors.length > 0) setErrors([]);
  };

  const submit = () => {
    const nextErrors = validateBenefitReferralInput(form, hospitals, coveredPeople);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }
    const referral = createReferral(form);
    submitReferral(referral.id);
    setForm((prev) => ({ ...prev, serviceReason: '', preferredVisitDate: '', documentNote: '', notes: '' }));
    onSubmitted?.(referral.workflowRequestId);
  };

  return (
    <Card variant="raised" size="lg">
      <CardEyebrow>Hospital referral · ไม่ใช่ reimbursement claim</CardEyebrow>
      <CardTitle>ขอใบส่งตัว / ePatient referral</CardTitle>
      <p className="mt-2 text-small text-ink-muted">กรอกข้อมูลใบส่งตัวโดยไม่ต้องใช้เลขใบเสร็จ จำนวนเงิน หรือเอกสารแนบเบิกย้อนหลัง</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FormField id="referral-covered-person" label="ผู้ใช้สิทธิ์" required>
          {(controlProps) => (
            <select
              {...controlProps}
              className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
              value={form.coveredPersonId}
              onChange={(event) => setField('coveredPersonId', event.target.value)}
            >
              {coveredPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          )}
        </FormField>
        <FormField id="referral-hospital" label="โรงพยาบาล / สาขา" required>
          {(controlProps) => (
            <select
              {...controlProps}
              className="h-10 w-full rounded-md border border-hairline bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
              value={form.hospitalId}
              onChange={(event) => setField('hospitalId', event.target.value)}
            >
              {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name} · {hospital.branch} · {hospital.province}</option>)}
            </select>
          )}
        </FormField>
        <FormField id="referral-service-reason" label="เหตุผลหรือบริการที่ต้องการพบแพทย์" help="ระบุอาการหรือแผนกที่ต้องการรับบริการ" required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              value={form.serviceReason}
              onChange={(event) => setField('serviceReason', event.target.value)}
              placeholder="เช่น พบแพทย์เฉพาะทาง"
            />
          )}
        </FormField>
        <FormField id="referral-visit-date" label="วันที่ต้องการเข้ารับบริการ" required>
          {(controlProps) => (
            <FormInput
              {...controlProps}
              type="date"
              value={form.preferredVisitDate}
              onChange={(event) => setField('preferredVisitDate', event.target.value)}
            />
          )}
        </FormField>
        <FormField id="referral-contact-phone" label="เบอร์ติดต่อสำหรับประสานงาน" help="ใช้เฉพาะให้ SPD ติดต่อกลับเกี่ยวกับใบส่งตัว">
          {(controlProps) => (
            <FormInput
              {...controlProps}
              value={form.contactPhone}
              onChange={(event) => setField('contactPhone', event.target.value)}
              placeholder="เช่น 080-000-0001"
            />
          )}
        </FormField>
        <FormField id="referral-document-note" label="หมายเหตุเอกสารประกอบ" help="ระบุเอกสารสิทธิ์หรือข้อมูลประกอบ ไม่ใช่ใบเสร็จเบิกย้อนหลัง">
          {(controlProps) => (
            <FormInput
              {...controlProps}
              value={form.documentNote}
              onChange={(event) => setField('documentNote', event.target.value)}
              placeholder="เช่น ใช้บัตรพนักงานและบัตรประชาชน"
            />
          )}
        </FormField>
        <FormField id="referral-notes" label="หมายเหตุถึง SPD" help="ไม่ต้องแนบข้อมูลใบเสร็จหรือจำนวนเงินในช่องนี้" className="sm:col-span-2">
          {(controlProps) => (
            <textarea
              {...controlProps}
              className="min-h-[88px] w-full rounded-md border border-hairline bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-[var(--dur-fast)] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-canvas"
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
            />
          )}
        </FormField>
      </div>
      {errors.length > 0 && <div role="alert" className="mt-4 rounded-md bg-danger-soft p-3 text-small text-ink"><ul className="list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="primary" onClick={submit}>ส่งคำขอใบส่งตัว</Button>
      </div>
    </Card>
  );
}
