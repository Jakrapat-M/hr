'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Card, CardEyebrow, Button, buttonVariants } from '@/components/cnext';
import { HospitalClaimForm, type SimpleClaimSubmission } from '@/components/benefits/templates';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';
import { benefitsHubRoute } from '@/lib/benefit-routes';
import { useBenefitClaimsStore } from '@/stores/benefit-claims';

const HOSPITAL_PLANS = BENEFIT_PLAN_REGISTRY.filter(
  (p) => p.template === 'hospital-claim' && p.recordType === 'claimable',
);

export default function HospitalClaimPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const [selectedId, setSelectedId] = useState(HOSPITAL_PLANS[0]?.id ?? '');
  const selected = HOSPITAL_PLANS.find((p) => p.id === selectedId) ?? HOSPITAL_PLANS[0];
  const submitClaim = useBenefitClaimsStore((s) => s.submitClaim);
  const [lastClaim, setLastClaim] = useState<{ id: string; workflowRequestId: string } | null>(null);

  // STA-63 — persist into the claims store (visible at /requests, /quick-approve, /admin/benefits/records)
  const handleSubmitted = (wfId: string, submission?: SimpleClaimSubmission) => {
    if (!selected) return;
    const receiptDate = submission?.receiptDate ?? new Date().toISOString().slice(0, 10);
    const claim = submitClaim({
      benefitCode: selected.id,
      benefitName: isTh ? selected.nameTh : selected.nameEn,
      benefitType: 'medical',
      remainingAmount: submission?.remainingAmount,
      receiptNo: submission?.receiptNo || wfId,
      receiptDate,
      receiptAmount: submission?.receiptAmount ?? 0,
      totalClaimAmount: submission?.totalClaimAmount ?? submission?.receiptAmount ?? 0,
      claimDate: submission?.claimDate,
      remark: submission?.remark,
      dynamicFields: submission?.dynamicFields,
    });
    setLastClaim({ id: claim.id, workflowRequestId: claim.workflowRequestId });
    setTimeout(() => setLastClaim(null), 6000);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>
            {isTh ? 'สวัสดิการ · เบิกค่ารักษาโรงพยาบาล' : 'Benefits · Hospital claim'}
          </CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {isTh ? 'เบิกค่ารักษาโรงพยาบาล' : 'Hospital Claim'}
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            {isTh
              ? 'ส่งคำขอเบิกค่ารักษาพยาบาลผู้ป่วยใน (IPD) หรือสวัสดิการครอบครัว — เลือกแผนแล้วกรอกแบบฟอร์ม'
              : 'Submit an inpatient (IPD) or dependent medical claim — choose a plan then fill in the form.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={benefitsHubRoute(locale)} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={14} aria-hidden />
            {isTh ? 'กลับ Benefits Hub' : 'Back to Benefits Hub'}
          </Link>
          <Link href={`/${locale}/requests`} className={buttonVariants({ variant: 'secondary' })}>
            <ClipboardList size={14} aria-hidden />
            {isTh ? 'ติดตามคำขอ' : 'Track requests'}
          </Link>
        </div>
      </header>

      {/* Plan picker */}
      <Card size="md" className="p-5">
        <CardEyebrow>{isTh ? 'เลือกแผนสวัสดิการ' : 'Choose benefit plan'}</CardEyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {HOSPITAL_PLANS.map((p) => (
            <Button
              key={p.id}
              variant={p.id === selectedId ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedId(p.id)}
            >
              {isTh ? p.nameTh : p.nameEn}
            </Button>
          ))}
        </div>
      </Card>

      {/* STA-63 — success card replaces prior console.log */}
      {lastClaim && (
        <Card variant="raised" size="md" className="border-success/30 bg-success-soft">
          <CardEyebrow>{isTh ? 'ส่งคำขอสำเร็จ' : 'Claim submitted'}</CardEyebrow>
          <p className="mt-2 text-small text-success">
            {isTh
              ? `บันทึกคำขอ ${lastClaim.workflowRequestId} แล้ว — ติดตามที่หน้า "คำขอของฉัน" และ SPD จะเห็นในคิวอนุมัติ`
              : `Saved request ${lastClaim.workflowRequestId} — visible in "My requests" and the SPD approval queue.`}
          </p>
          <Link
            href={`/${locale}/requests`}
            className="mt-3 inline-block text-small font-semibold text-success underline"
          >
            {isTh ? 'ไปยังคำขอของฉัน →' : 'Go to my requests →'}
          </Link>
        </Card>
      )}

      {/* Hospital claim form — mounts appropriate template */}
      {selected && (
        <HospitalClaimForm
          plan={selected}
          onSubmitted={handleSubmitted}
        />
      )}
    </div>
  );
}
