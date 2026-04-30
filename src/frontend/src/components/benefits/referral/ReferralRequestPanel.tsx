'use client';

import { useState } from 'react';
import { Button, Card, CardEyebrow, CardTitle } from '@/components/humi';
import { validateBenefitReferralInput, useBenefitReferralsStore } from '@/stores/benefit-referrals';

export function ReferralRequestPanel({ onSubmitted }: { onSubmitted?: (workflowRequestId: string) => void }) {
  const hospitals = useBenefitReferralsStore((state) => state.hospitals);
  const coveredPeople = useBenefitReferralsStore((state) => state.coveredPeople);
  const createReferral = useBenefitReferralsStore((state) => state.createReferral);
  const submitReferral = useBenefitReferralsStore((state) => state.submitReferral);
  const [form, setForm] = useState({ coveredPersonId: coveredPeople[0]?.id ?? '', hospitalId: hospitals[0]?.id ?? '', serviceReason: '', preferredVisitDate: '', notes: '' });
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
    setForm((prev) => ({ ...prev, serviceReason: '', preferredVisitDate: '', notes: '' }));
    onSubmitted?.(referral.workflowRequestId);
  };

  return (
    <Card variant="raised" size="lg">
      <CardEyebrow>Hospital referral · ไม่ใช่ reimbursement claim</CardEyebrow>
      <CardTitle>ขอใบส่งตัว / ePatient referral</CardTitle>
      <p className="mt-2 text-small text-ink-muted">กรอกข้อมูลใบส่งตัวโดยไม่ต้องใช้เลขใบเสร็จ จำนวนเงิน หรือเอกสารแนบเบิกย้อนหลัง</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="humi-label">ผู้ใช้สิทธิ์
          <select className="humi-input mt-1" value={form.coveredPersonId} onChange={(event) => setField('coveredPersonId', event.target.value)}>
            {coveredPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <label className="humi-label">โรงพยาบาล / สาขา
          <select className="humi-input mt-1" value={form.hospitalId} onChange={(event) => setField('hospitalId', event.target.value)}>
            {hospitals.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name} · {hospital.branch} · {hospital.province}</option>)}
          </select>
        </label>
        <label className="humi-label">เหตุผลหรือบริการที่ต้องการพบแพทย์
          <input className="humi-input mt-1" value={form.serviceReason} onChange={(event) => setField('serviceReason', event.target.value)} placeholder="เช่น พบแพทย์เฉพาะทาง" />
        </label>
        <label className="humi-label">วันที่ต้องการเข้ารับบริการ
          <input className="humi-input mt-1" type="date" value={form.preferredVisitDate} onChange={(event) => setField('preferredVisitDate', event.target.value)} />
        </label>
        <label className="humi-label sm:col-span-2">หมายเหตุถึง SPD
          <textarea className="humi-input mt-1 min-h-[88px]" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
        </label>
      </div>
      {errors.length > 0 && <div role="alert" className="mt-4 rounded-md bg-danger-tint p-3 text-small text-ink"><ul className="list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="primary" onClick={submit}>ส่งคำขอใบส่งตัว</Button>
      </div>
    </Card>
  );
}
