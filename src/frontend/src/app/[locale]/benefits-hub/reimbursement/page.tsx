'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { Card, CardEyebrow, Button, buttonVariants } from '@/components/humi';
import { SimpleClaimForm, type SimpleClaimSubmission } from '@/components/benefits/templates';
import { BENEFIT_PLAN_REGISTRY } from '@/data/benefits/plan-registry';
import { benefitsHubRoute } from '@/lib/benefit-routes';
import { HUMI_CLAIM_ALLOWANCES } from '@/lib/humi-mock-data';
import { useBenefitClaimsStore, type BenefitClaimInput, type BenefitClaimType } from '@/stores/benefit-claims';

// STA-145: BE-MOB-001 is now a canonical claimable plan in the registry
// (category 'mobile'), so it is already included here — no synthetic override.
// The prior synthesis from the gasoline plan leaked category 'gasoline' into the
// Mobile claim form (the Mobile-renders-Gasoline bug).
const SIMPLE_PLANS = BENEFIT_PLAN_REGISTRY.filter(
  // STA-148 req-4 — BE-MED-003 (IPD-self-paid) merged into the single
  // "Medical Reimbursement" chip (BE-MED-001); excluded here, registry entry kept.
  (p) => p.template === 'simple-claim' && p.recordType === 'claimable' && p.id !== 'BE-MED-003',
);

const allowanceRemaining = (allowanceId: string) => {
  const allowance = HUMI_CLAIM_ALLOWANCES.find((item) => item.id === allowanceId);
  return allowance ? Math.max(0, allowance.limit - allowance.used) : undefined;
};

const ALLOWANCE_TO_PLAN: Record<string, {
  planId: string;
  benefitType: BenefitClaimType;
  remainingAmount?: number;
}> = {
  'ca-medical': { planId: 'BE-MED-001', benefitType: 'medical', remainingAmount: 25600 },
  'ca-dental': { planId: 'BE-DEN-001', benefitType: 'medical', remainingAmount: allowanceRemaining('ca-dental') },
  'ca-phone': { planId: 'BE-MOB-001', benefitType: 'mobile', remainingAmount: allowanceRemaining('ca-phone') },
  'ca-fuel': { planId: 'BE-GAS-001', benefitType: 'gasoline', remainingAmount: allowanceRemaining('ca-fuel') },
};

const PLAN_TYPE_FALLBACK: Partial<Record<string, BenefitClaimType>> = {
  'BE-MED-001': 'medical',
  'BE-DEN-001': 'medical',
  'BE-MOB-001': 'mobile',
  'BE-GAS-001': 'gasoline',
};

type BenefitClaimInputWithLaneC = BenefitClaimInput & {
  claimDate?: string;
  remark?: string;
};

export default function ReimbursementPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAllowance = searchParams.get('allowance') ?? '';
  const initialMappedPlanId = ALLOWANCE_TO_PLAN[initialAllowance]?.planId;
  const [selectedId, setSelectedId] = useState(initialMappedPlanId ?? SIMPLE_PLANS[0]?.id ?? '');
  const selected = SIMPLE_PLANS.find((p) => p.id === selectedId) ?? SIMPLE_PLANS[0];
  const selectedMapping = Object.values(ALLOWANCE_TO_PLAN).find((mapping) => mapping.planId === selected?.id);
  const benefitType = selectedMapping?.benefitType ?? PLAN_TYPE_FALLBACK[selected?.id ?? ''] ?? 'medical';
  const remainingAmount = selectedMapping?.remainingAmount ?? selected?.annualLimitThb ?? undefined;
  const submitClaim = useBenefitClaimsStore((s) => s.submitClaim);

  // STA-63 — persist into the claims store (visible at /requests, /quick-approve, /admin/benefits/records)
  const handleSubmitted = (wfId: string, submission?: SimpleClaimSubmission) => {
    if (!selected) return;
    const receiptDate = submission?.receiptDate ?? new Date().toISOString().slice(0, 10);
    const claimInput: BenefitClaimInputWithLaneC = {
      benefitCode: selected.id,
      benefitName: isTh ? selected.nameTh : selected.nameEn,
      benefitType,
      remainingAmount,
      receiptNo: submission?.receiptNo || wfId,
      receiptDate,
      receiptAmount: submission?.receiptAmount ?? 0,
      totalClaimAmount: submission?.totalClaimAmount ?? submission?.receiptAmount ?? 0,
      claimDate: submission?.claimDate,
      remark: submission?.remark,
      dynamicFields: submission?.dynamicFields,
    };
    submitClaim(claimInput);
    // STA-184 — after confirming the preview, return to the Benefits Hub so the
    // claim "feels submitted" (locale-prefixed; next/navigation won't add it).
    router.push(benefitsHubRoute(locale));
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>
            {isTh ? 'สวัสดิการ · เบิกตามใบเสร็จ' : 'Benefits · Receipt-based claim'}
          </CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {isTh ? 'เบิกสวัสดิการ' : 'Reimbursement'}
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            {isTh
              ? 'ส่งคำขอเบิกย้อนหลังตามใบเสร็จ — เลือกประเภทสวัสดิการแล้วกรอกแบบฟอร์ม'
              : 'Submit a retroactive receipt-based claim — choose a benefit type then fill in the form.'}
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
        <CardEyebrow>{isTh ? 'เลือกประเภทเบิก' : 'Choose claim type'}</CardEyebrow>
        <div className="mt-3 flex flex-wrap gap-2">
          {SIMPLE_PLANS.map((p) => (
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

      {/* Claim form — mounts appropriate template */}
      {selected && (
        <SimpleClaimForm
          plan={selected}
          selectedBenefitLabel={isTh ? selected.nameTh : selected.nameEn}
          remainingAmount={remainingAmount}
          onSubmitted={handleSubmitted}
          confirmBeforeSubmit
        />
      )}
    </div>
  );
}
