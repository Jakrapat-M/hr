'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { CardEyebrow, buttonVariants } from '@/components/humi';
import { TaxPlanningPanel } from '@/components/benefits/tax/TaxPlanningPanel';
import { benefitsHubRoute } from '@/lib/benefit-routes';

export default function PayrollTaxPlanningPage() {
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'th';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>Payroll · Tax planning</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            วางแผนภาษี
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            เส้นทางนี้อยู่ภายใต้ Payroll/Tax สำหรับส่งแผนให้ Payroll ตรวจ ไม่ใช่โหมดวางแผนในโปรไฟล์
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={benefitsHubRoute(locale)} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={14} aria-hidden />
            กลับ Benefits Hub
          </Link>
          <Link href={`/${locale}/requests`} className={buttonVariants({ variant: 'secondary' })}>
            <ClipboardList size={14} aria-hidden />
            ติดตามคำขอ
          </Link>
        </div>
      </header>
      <TaxPlanningPanel />
    </div>
  );
}
