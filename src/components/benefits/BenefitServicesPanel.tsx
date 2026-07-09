'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Hospital, Shield } from 'lucide-react';
import { Card, CardEyebrow, CardTitle, buttonVariants } from '@/components/cnext';
import { Capability } from '@/components/cnext';
import {
  benefitReferralRoute,
  benefitReimbursementRoute,
  benefitHospitalClaimRoute,
} from '@/lib/benefit-routes';
import { cn } from '@/lib/utils';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import {
  BENEFIT_PLAN_REGISTRY,
  getEmployeeClaimablePlans,
  getAdminOnlyPlans,
  type BenefitPlan,
  type PlanCategory,
} from '@/data/benefits/plan-registry';

// ── Category definitions for filter chips ────────────────────────────────────

const CLAIMABLE_CATEGORIES: { id: PlanCategory; labelTh: string; labelEn: string }[] = [
  { id: 'medical',    labelTh: 'ค่ารักษาพยาบาล', labelEn: 'Medical'     },
  { id: 'dental',     labelTh: 'ทันตกรรม',        labelEn: 'Dental'      },
  { id: 'physical',   labelTh: 'ตรวจสุขภาพ',      labelEn: 'Checkup'     },
  { id: 'gasoline',   labelTh: 'ค่าน้ำมัน',        labelEn: 'Gasoline'    },
  { id: 'toll',       labelTh: 'ค่าผ่านทาง',       labelEn: 'Toll'        },
  { id: 'parking',    labelTh: 'ค่าจอดรถ',         labelEn: 'Parking'     },
  { id: 'gift',       labelTh: 'ของเยี่ยม',         labelEn: 'Gifts'       },
];

const ADMIN_CATEGORIES: { id: PlanCategory; labelTh: string; labelEn: string }[] = [
  { id: 'funeral',     labelTh: 'ฌาปนกิจ',            labelEn: 'Funeral'     },
  { id: 'wreath',      labelTh: 'พวงหรีด',             labelEn: 'Wreath'      },
  { id: 'beneficiary', labelTh: 'ผู้รับผลประโยชน์',    labelEn: 'Beneficiary' },
  { id: 'life',        labelTh: 'ประกันชีวิต',         labelEn: 'Life'        },
];

// ── Route resolver — maps a plan to its target URL ───────────────────────────

function planRoute(plan: BenefitPlan, locale: string): string {
  if (plan.recordType === 'records' || plan.recordType === 'info') {
    return `/${locale}/admin/benefits/records/${plan.id}`;
  }
  if (plan.template === 'hospital-claim') {
    return benefitHospitalClaimRoute(locale);
  }
  // simple-claim, records-dependent claimable (BE-GIF-005)
  return benefitReimbursementRoute(locale);
}

// ── Sub-component: one plan chip / card ──────────────────────────────────────

function PlanChip({
  plan,
  locale,
  isTh,
}: {
  plan: BenefitPlan;
  locale: string;
  isTh: boolean;
}) {
  const href = planRoute(plan, locale);
  const isHospital = plan.template === 'hospital-claim';
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: isHospital ? 'secondary' : 'ghost', size: 'sm' }),
        'inline-flex items-center gap-1.5 whitespace-nowrap'
      )}
    >
      {isHospital ? <Hospital size={13} aria-hidden /> : <FileText size={13} aria-hidden />}
      {isTh ? plan.nameTh.replace('[Records] ', '') : plan.nameEn.replace('[Records] ', '')}
      <ArrowRight size={12} aria-hidden />
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function BenefitServicesPanel({ locale }: { locale: string; onOpenClaim?: () => void }) {
  const referrals = useBenefitReferralsStore((state) => state.referrals);
  const pendingReferralCount = referrals.filter((item) =>
    ['pending_spd', 'spd_reviewing', 'send_back', 'approved'].includes(item.status)
  ).length;
  const issuedReferralCount = referrals.filter((item) => item.status === 'letter_issued').length;

  const isTh = locale !== 'en';

  // Active category filter — null = show all claimable
  const [activeCategory, setActiveCategory] = useState<PlanCategory | null>(null);

  const claimablePlans = getEmployeeClaimablePlans();
  const adminPlans = getAdminOnlyPlans();

  const visibleClaimable = activeCategory
    ? claimablePlans.filter((p) => p.category === activeCategory)
    : claimablePlans;

  const visibleAdmin = activeCategory
    ? adminPlans.filter((p) => p.category === activeCategory)
    : adminPlans;

  return (
    <section aria-labelledby="benefit-services-heading">
      <Card variant="raised" size="lg" className="border-accent-soft bg-canvas-soft">
        {/* Header row */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <CardEyebrow>{isTh ? 'งานสวัสดิการ · เลือกแผน' : 'Benefits · Choose a plan'}</CardEyebrow>
            <CardTitle id="benefit-services-heading" className="mt-1">
              {isTh ? 'เลือกสวัสดิการที่ต้องการ' : 'Select a benefit to get started'}
            </CardTitle>
            <p className="mt-2 max-w-2xl text-body text-ink-soft leading-relaxed">
              {isTh
                ? 'เลือกหมวดหมู่เพื่อกรองแผน จากนั้นคลิกที่ชื่อแผนเพื่อไปยังแบบฟอร์ม'
                : 'Filter by category then click a plan name to open the form.'}
            </p>
          </div>

          {/* Quick-access primary actions */}
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end" aria-label="benefit-owned actions">
            <Link
              href={benefitReimbursementRoute(locale)}
              className={cn(
                buttonVariants({ variant: 'primary', block: true }),
                'min-h-[44px] sm:min-w-[180px]'
              )}
              data-benefit-owned-action="true"
            >
              <FileText size={16} aria-hidden />
              <span>{isTh ? 'เบิกสวัสดิการ' : 'Reimbursement'}</span>
              <ArrowRight size={14} aria-hidden />
            </Link>
            <Link
              href={benefitReferralRoute(locale)}
              className={cn(
                buttonVariants({ variant: 'secondary', block: true }),
                'min-h-[44px] sm:min-w-[180px]'
              )}
              data-benefit-owned-action="true"
            >
              <Hospital size={16} aria-hidden />
              <span>{isTh ? 'ขอใบส่งตัว' : 'Hospital referral'}</span>
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>

        {/* ── Category filter chips ─────────────────────────────────────────── */}
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="mb-2.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {isTh ? 'กรองตามหมวดหมู่' : 'Filter by category'}
          </p>
          <div
            role="group"
            aria-label={isTh ? 'หมวดหมู่สวัสดิการ' : 'Benefit categories'}
            className="flex flex-wrap gap-2"
          >
            {/* "All" chip */}
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              aria-pressed={activeCategory === null}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-small font-medium transition-colors',
                'border border-hairline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                activeCategory === null
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface text-ink-soft hover:bg-canvas-soft hover:text-ink'
              )}
            >
              {isTh ? 'ทั้งหมด' : 'All'}
            </button>

            {/* Claimable category chips */}
            {CLAIMABLE_CATEGORIES.map((cat) => {
              const hasPlans = claimablePlans.some((p) => p.category === cat.id);
              if (!hasPlans) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                  aria-pressed={activeCategory === cat.id}
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-small font-medium transition-colors',
                    'border border-hairline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                    activeCategory === cat.id
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface text-ink-soft hover:bg-canvas-soft hover:text-ink'
                  )}
                >
                  {isTh ? cat.labelTh : cat.labelEn}
                </button>
              );
            })}

            {/* Admin category chips — gated */}
            <Capability action="edit">
              {ADMIN_CATEGORIES.map((cat) => {
                const hasPlans = adminPlans.some((p) => p.category === cat.id);
                if (!hasPlans) return null;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                    aria-pressed={activeCategory === cat.id}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-small font-medium transition-colors',
                      'border border-hairline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                      activeCategory === cat.id
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface text-ink-muted hover:bg-canvas-soft hover:text-ink'
                    )}
                  >
                    <Shield size={11} aria-hidden className="opacity-60" />
                    {isTh ? cat.labelTh : cat.labelEn}
                  </button>
                );
              })}
            </Capability>
          </div>
        </div>

        {/* ── Plan picker — claimable plans ─────────────────────────────────── */}
        {visibleClaimable.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {isTh ? 'สิทธิ์เบิกได้' : 'Employee claimable'}
            </p>
            <div className="flex flex-wrap gap-2">
              {visibleClaimable.map((plan) => (
                <PlanChip key={plan.id} plan={plan} locale={locale} isTh={isTh} />
              ))}
            </div>
          </div>
        )}

        {/* ── Plan picker — admin/HR-only plans (gated) ────────────────────── */}
        <Capability action="edit">
          {visibleAdmin.length > 0 && (
            <div className="mt-4 rounded-[var(--radius-md)] border border-hairline bg-canvas-soft px-4 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Shield size={13} className="text-ink-muted" aria-hidden />
                <p className="text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  {isTh ? 'บันทึกโดย HR เท่านั้น' : 'HR records only'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleAdmin.map((plan) => (
                  <PlanChip key={plan.id} plan={plan} locale={locale} isTh={isTh} />
                ))}
              </div>
            </div>
          )}
        </Capability>

        {/* ── Footer context strip ──────────────────────────────────────────── */}
        <div className="mt-5 grid gap-3 border-t border-hairline pt-4 text-small text-ink-muted sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <FileText size={16} className="mt-0.5 text-accent" aria-hidden />
            <p>
              <span className="font-semibold text-ink">
                {isTh ? 'เบิกสวัสดิการ' : 'Reimbursement'}
              </span>{' '}
              {isTh
                ? 'ใช้ข้อมูลสิทธิ์และวงเงินจากโปรไฟล์/HRMS แต่ส่งคำขอในเส้นทางเฉพาะ'
                : 'Uses entitlement and limit data from your profile / HRMS.'}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <Hospital size={16} className="mt-0.5 text-accent" aria-hidden />
            <p>
              <span className="font-semibold text-ink">
                {isTh ? 'ใบส่งตัว' : 'Referral'}
              </span>{' '}
              {isTh
                ? `สำหรับ ePatient ก่อนเข้ารับบริการ · รอ ${pendingReferralCount} · ออกแล้ว ${issuedReferralCount}`
                : `ePatient before visit · pending ${pendingReferralCount} · issued ${issuedReferralCount}`}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
