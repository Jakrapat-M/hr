'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { CardEyebrow, buttonVariants } from '@/components/humi';
import { ReimbursementRequestPanel } from '@/components/benefits/reimbursement/ReimbursementRequestPanel';
import { benefitsHubRoute } from '@/lib/benefit-routes';

export default function BenefitReimbursementPage() {
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'th';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>สวัสดิการ · Reimbursement</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            เบิกสวัสดิการ
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            เส้นทางนี้เป็นคำขอเบิกย้อนหลังตามใบเสร็จโดย Benefits Hub เป็นเจ้าของ ไม่ปะปนกับใบส่งตัวหรือการวางแผนภาษี
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
      <ReimbursementRequestPanel />
    </div>
  );
}
