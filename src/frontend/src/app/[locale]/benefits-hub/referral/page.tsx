'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { CardEyebrow, buttonVariants } from '@/components/humi';
import { ReferralRequestPanel } from '@/components/benefits/referral/ReferralRequestPanel';
import { benefitsHubRoute } from '@/lib/benefit-routes';

export default function BenefitReferralPage() {
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === 'string' ? params.locale : 'th';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <CardEyebrow>สวัสดิการ · Hospital referral</CardEyebrow>
          <h1 className="font-display text-[length:var(--text-display-h1)] font-semibold leading-[var(--text-display-h1--line-height)] tracking-tight text-ink">
            ขอใบส่งตัว / ePatient
          </h1>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            เส้นทางนี้ใช้สำหรับให้ SPD ออกใบส่งตัวก่อนเข้ารับบริการ ไม่ใช่การเบิกย้อนหลังตามใบเสร็จ
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
      <ReferralRequestPanel />
    </div>
  );
}
