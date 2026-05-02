'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft, Info } from 'lucide-react';
import { Card, CardEyebrow, CardTitle, buttonVariants } from '@/components/humi';
import { RecordsFlatForm } from '@/components/benefits/templates/RecordsFlatForm';
import { getPlan } from '@/data/benefits/plan-registry';
import { benefitsHubRoute } from '@/lib/benefit-routes';

// BE-BEN-001: Beneficiary data — records-flat (HR-logged, employee view-only context)
const PLAN_ID = 'BE-BEN-001';

export default function BeneficiaryPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const plan = getPlan(PLAN_ID);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>
            {isTh ? 'สวัสดิการ · ผู้รับผลประโยชน์' : 'Benefits · Beneficiary'}
          </CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {isTh ? 'ข้อมูลผู้รับผลประโยชน์' : 'Beneficiary Information'}
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            {isTh
              ? 'ข้อมูลผู้รับผลประโยชน์จากประกันชีวิต — บันทึกและแก้ไขโดย HR เท่านั้น'
              : 'Life insurance beneficiary data — recorded and updated by HR only.'}
          </p>
        </div>
        <Link href={benefitsHubRoute(locale)} className={buttonVariants({ variant: 'ghost' })}>
          <ArrowLeft size={14} aria-hidden />
          {isTh ? 'กลับ Benefits Hub' : 'Back to Benefits Hub'}
        </Link>
      </header>

      {/* Info notice for employees */}
      <Card size="md" className="p-5">
        <div className="flex gap-3">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div>
            <CardTitle className="text-base">
              {isTh ? 'วิธีอัปเดตข้อมูลผู้รับผลประโยชน์' : 'How to update beneficiary information'}
            </CardTitle>
            <p className="mt-1 text-small text-ink-muted">
              {isTh
                ? 'กรุณาติดต่อ HR โดยตรงเพื่อเพิ่มหรือแก้ไขผู้รับผลประโยชน์ พร้อมแนบสำเนาบัตรประชาชนและหลักฐานความสัมพันธ์'
                : 'Contact HR directly to add or update beneficiaries. Bring a copy of the beneficiary\'s ID and relationship proof.'}
            </p>
          </div>
        </div>
      </Card>

      {plan ? (
        <RecordsFlatForm
          plan={plan}
          onSubmitted={(id) => console.log('record saved', id)}
        />
      ) : (
        <p className="text-small text-ink-muted">
          {isTh ? 'ไม่พบข้อมูลแผนสวัสดิการ' : 'Benefit plan not found.'}
        </p>
      )}
    </div>
  );
}
