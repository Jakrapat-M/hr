'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { CardEyebrow, buttonVariants } from '@/components/cnext';
import { RecordsComputedView } from '@/components/benefits/templates/RecordsComputedView';
import { getPlan } from '@/data/benefits/plan-registry';
import { benefitsHubRoute } from '@/lib/benefit-routes';

// BE-LIF-001: Life & Accident — records-computed (display-only, salary-driven)
const PLAN_ID = 'BE-LIF-001';

export default function LifeAccidentPage() {
  const locale = useLocale();
  const isTh = locale !== 'en';

  const plan = getPlan(PLAN_ID);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>
            {isTh ? 'สวัสดิการ · ประกันชีวิตและอุบัติเหตุ' : 'Benefits · Life & accident insurance'}
          </CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            {isTh ? 'ประกันชีวิตและอุบัติเหตุ' : 'Life & Accident Insurance'}
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            {isTh
              ? 'ข้อมูลความคุ้มครองของคุณ — คำนวณจากฐานเงินเดือนโดยอัตโนมัติ ไม่ต้องยื่นคำขอ'
              : 'Your coverage summary — calculated automatically from your base salary. No claim submission required.'}
          </p>
        </div>
        <Link href={benefitsHubRoute(locale)} className={buttonVariants({ variant: 'ghost' })}>
          <ArrowLeft size={14} aria-hidden />
          {isTh ? 'กลับ Benefits Hub' : 'Back to Benefits Hub'}
        </Link>
      </header>

      {plan ? (
        <RecordsComputedView plan={plan} />
      ) : (
        <p className="text-small text-ink-muted">
          {isTh ? 'ไม่พบข้อมูลแผนสวัสดิการ' : 'Benefit plan not found.'}
        </p>
      )}
    </div>
  );
}
