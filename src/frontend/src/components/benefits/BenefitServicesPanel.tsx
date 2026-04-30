'use client';

import Link from 'next/link';
import { ArrowRight, Calculator, FileText, Hospital } from 'lucide-react';
import { Button, Card, CardEyebrow, CardTitle } from '@/components/humi';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import { selectTaxPlanningSafeSummary, useBenefitTaxPlanningStore } from '@/stores/benefit-tax-planning';

export function BenefitServicesPanel({ locale, onOpenClaim }: { locale: string; onOpenClaim: () => void }) {
  const referrals = useBenefitReferralsStore((state) => state.referrals);
  const taxProfile = useBenefitTaxPlanningStore((state) => state.profile);
  const taxDrafts = useBenefitTaxPlanningStore((state) => state.drafts);
  const taxSummary = selectTaxPlanningSafeSummary({ profile: taxProfile, drafts: taxDrafts });
  const pendingReferralCount = referrals.filter((item) => ['pending_spd', 'send_back', 'approved'].includes(item.status)).length;
  const issuedReferralCount = referrals.filter((item) => item.status === 'letter_issued').length;

  return (
    <section className="grid gap-3 lg:grid-cols-3" aria-labelledby="benefit-services-heading">
      <h3 id="benefit-services-heading" className="sr-only">บริการสวัสดิการของฉัน</h3>
      <Card variant="flat" tone="canvas" className="min-h-[220px]">
        <div className="flex h-full flex-col gap-4">
          <CardEyebrow>Benefit reimbursement</CardEyebrow>
          <CardTitle className="flex items-center gap-2"><FileText size={18} aria-hidden />เบิกสวัสดิการ</CardTitle>
          <p className="text-small text-ink-muted">คำขอเบิกย้อนหลังตามใบเสร็จและวงเงินสวัสดิการเดิม</p>
          <p className="text-small font-semibold text-ink">แยกจากใบส่งตัวและวางแผนภาษี</p>
          <Button className="mt-auto min-h-[44px]" variant="secondary" onClick={onOpenClaim}>เบิกสวัสดิการ</Button>
        </div>
      </Card>

      <Card variant="flat" tone="canvas" className="min-h-[220px]">
        <div className="flex h-full flex-col gap-4">
          <CardEyebrow>Hospital referral · ePatient</CardEyebrow>
          <CardTitle className="flex items-center gap-2"><Hospital size={18} aria-hidden />ขอใบส่งตัว</CardTitle>
          <p className="text-small text-ink-muted">เลือกผู้ใช้สิทธิ์ โรงพยาบาล และวันที่เข้ารับบริการ แล้วให้ SPD ออกใบส่งตัว</p>
          <p className="text-small font-semibold text-ink">ไม่ใช่การเบิกย้อนหลัง · รอ {pendingReferralCount} · ออกแล้ว {issuedReferralCount}</p>
          <Link href={`/${locale}/profile/me?tab=benefits&service=referral`} className="mt-auto">
            <Button className="min-h-[44px]" variant="secondary" trailingIcon={<ArrowRight size={14} />}>ขอใบส่งตัว</Button>
          </Link>
        </div>
      </Card>

      <Card variant="flat" tone="canvas" className="min-h-[220px]">
        <div className="flex h-full flex-col gap-4">
          <CardEyebrow>Tax planning</CardEyebrow>
          <CardTitle className="flex items-center gap-2"><Calculator size={18} aria-hidden />วางแผนภาษี</CardTitle>
          <p className="text-small text-ink-muted">จำลอง PIT จากรายได้ YTD และค่าลดหย่อนที่ประกาศไว้ พร้อมสมมติฐานปีภาษี</p>
          <p className="text-small font-semibold text-ink">ประมาณการเพื่อวางแผน ไม่ใช่คำแนะนำภาษี · ร่าง {taxSummary.savedDrafts}</p>
          <Link href={`/${locale}/profile/me?tab=tax&mode=planning`} className="mt-auto">
            <Button className="min-h-[44px]" variant="secondary" trailingIcon={<ArrowRight size={14} />}>วางแผนภาษี</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}
