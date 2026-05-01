'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Hospital } from 'lucide-react';
import { Button, Card, CardEyebrow, CardTitle } from '@/components/humi';
import { benefitReferralRoute, benefitReimbursementRoute } from '@/lib/benefit-routes';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';

export function BenefitServicesPanel({ locale }: { locale: string; onOpenClaim?: () => void }) {
  const referrals = useBenefitReferralsStore((state) => state.referrals);
  const pendingReferralCount = referrals.filter((item) => ['pending_spd', 'spd_reviewing', 'send_back', 'approved'].includes(item.status)).length;
  const issuedReferralCount = referrals.filter((item) => item.status === 'letter_issued').length;

  return (
    <section className="grid gap-3 lg:grid-cols-2" aria-labelledby="benefit-services-heading">
      <h3 id="benefit-services-heading" className="sr-only">บริการสวัสดิการของฉัน</h3>
      <Card variant="flat" tone="canvas" className="min-h-[220px]">
        <div className="flex h-full flex-col gap-4">
          <CardEyebrow>Benefit reimbursement</CardEyebrow>
          <CardTitle className="flex items-center gap-2"><FileText size={18} aria-hidden />เบิกสวัสดิการ</CardTitle>
          <p className="text-small text-ink-muted">คำขอเบิกย้อนหลังตามใบเสร็จและวงเงินสวัสดิการเดิม</p>
          <p className="text-small font-semibold text-ink">บริการเบิกย้อนหลัง แยกจากใบส่งตัว</p>
          <Link href={benefitReimbursementRoute(locale)} className="mt-auto">
            <Button className="min-h-[44px]" variant="secondary" trailingIcon={<ArrowRight size={14} />}>เบิกสวัสดิการ</Button>
          </Link>
        </div>
      </Card>

      <Card variant="flat" tone="canvas" className="min-h-[220px]">
        <div className="flex h-full flex-col gap-4">
          <CardEyebrow>Hospital referral · ePatient</CardEyebrow>
          <CardTitle className="flex items-center gap-2"><Hospital size={18} aria-hidden />ขอใบส่งตัว</CardTitle>
          <p className="text-small text-ink-muted">เลือกผู้ใช้สิทธิ์ โรงพยาบาล และวันที่เข้ารับบริการ แล้วให้ SPD ออกใบส่งตัว</p>
          <p className="text-small font-semibold text-ink">ไม่ใช่การเบิกย้อนหลัง · รอ {pendingReferralCount} · ออกแล้ว {issuedReferralCount}</p>
          <Link href={benefitReferralRoute(locale)} className="mt-auto">
            <Button className="min-h-[44px]" variant="secondary" trailingIcon={<ArrowRight size={14} />}>ขอใบส่งตัว</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
