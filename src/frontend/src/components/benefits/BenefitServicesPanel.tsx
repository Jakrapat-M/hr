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
    <section aria-labelledby="benefit-services-heading">
      <Card variant="raised" size="lg" className="border-accent-soft bg-canvas-soft">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <CardEyebrow>เริ่มบริการสวัสดิการ</CardEyebrow>
            <CardTitle id="benefit-services-heading" className="mt-1">
              ต้องการทำอะไรวันนี้?
            </CardTitle>
            <p className="mt-2 max-w-2xl text-body text-ink-soft leading-relaxed">
              เลือก action หลักจากจุดเดียว ส่วนการ์ดด้านล่างใช้สำหรับอ่านสิทธิ์และรายละเอียดเท่านั้น
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link href={benefitReimbursementRoute(locale)} className="sm:min-w-[180px]">
              <Button
                block
                className="min-h-[48px]"
                variant="primary"
                leadingIcon={<FileText size={16} aria-hidden />}
                trailingIcon={<ArrowRight size={14} aria-hidden />}
              >
                เบิกสวัสดิการ
              </Button>
            </Link>
            <Link href={benefitReferralRoute(locale)} className="sm:min-w-[180px]">
              <Button
                block
                className="min-h-[48px]"
                variant="secondary"
                leadingIcon={<Hospital size={16} aria-hidden />}
                trailingIcon={<ArrowRight size={14} aria-hidden />}
              >
                ขอใบส่งตัว
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-hairline pt-4 text-small text-ink-muted sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 text-accent" aria-hidden />
            <p>
              <span className="font-semibold text-ink">เบิกสวัสดิการ</span> สำหรับคำขอย้อนหลังตามใบเสร็จและวงเงินเดิม
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Hospital size={16} className="mt-0.5 text-accent" aria-hidden />
            <p>
              <span className="font-semibold text-ink">ใบส่งตัว</span> สำหรับ ePatient ก่อนเข้ารับบริการ · รอ {pendingReferralCount} · ออกแล้ว {issuedReferralCount}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
