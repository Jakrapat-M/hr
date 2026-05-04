'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Fuel,
  Hospital,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { Card, CardEyebrow, CardTitle, buttonVariants } from '@/components/humi';
import { Capability } from '@/components/humi';
import { benefitReferralRoute, benefitClaimRoute } from '@/lib/benefit-routes';
import { cn } from '@/lib/utils';
import { useBenefitReferralsStore } from '@/stores/benefit-referrals';
import {
  getEmployeeClaimablePlans,
  getAdminOnlyPlans,
  type BenefitPlan,
  type PlanCategory,
} from '@/data/benefits/plan-registry';

// ── Filter chip categories ────────────────────────────────────────────────────

const CLAIMABLE_CATEGORIES: { id: PlanCategory; labelTh: string; labelEn: string }[] = [
  { id: 'medical',  labelTh: 'ค่ารักษาพยาบาล', labelEn: 'Medical'  },
  { id: 'dental',   labelTh: 'ทันตกรรม',         labelEn: 'Dental'   },
  { id: 'physical', labelTh: 'ตรวจสุขภาพ',       labelEn: 'Checkup'  },
  { id: 'gasoline', labelTh: 'ค่าน้ำมัน',         labelEn: 'Gasoline' },
  { id: 'toll',     labelTh: 'ค่าผ่านทาง',        labelEn: 'Toll'     },
  { id: 'parking',  labelTh: 'ค่าจอดรถ',          labelEn: 'Parking'  },
  { id: 'gift',     labelTh: 'ของเยี่ยม',          labelEn: 'Gifts'    },
];

const ADMIN_CATEGORIES: { id: PlanCategory; labelTh: string; labelEn: string }[] = [
  { id: 'funeral',     labelTh: 'ฌาปนกิจ',            labelEn: 'Funeral'     },
  { id: 'wreath',      labelTh: 'พวงหรีด',             labelEn: 'Wreath'      },
  { id: 'beneficiary', labelTh: 'ผู้รับผลประโยชน์',    labelEn: 'Beneficiary' },
  { id: 'life',        labelTh: 'ประกันชีวิต',         labelEn: 'Life'        },
];

// ── Primary action tiles — 3 task-oriented entry points ──────────────────────

type PrimaryAction = {
  id: 'medical' | 'transport' | 'referral';
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  href: (locale: string) => string;
  badgeCount?: number;
};

function buildPrimaryActions(pendingReferralCount: number): PrimaryAction[] {
  return [
    {
      id: 'medical',
      icon: <Hospital size={20} aria-hidden />,
      titleTh: 'เบิกค่ารักษาพยาบาล',
      titleEn: 'Medical claim',
      subtitleTh: 'OPD · IPD · ทันตกรรม · ตรวจสุขภาพ',
      subtitleEn: 'OPD · IPD · Dental · Checkup',
      href: (locale) => benefitClaimRoute(locale, 'BE-MED-001'),
    },
    {
      id: 'transport',
      icon: <Fuel size={20} aria-hidden />,
      titleTh: 'เบิกค่าเดินทาง',
      titleEn: 'Transport claim',
      subtitleTh: 'น้ำมัน · ทางด่วน · ค่าจอดรถ',
      subtitleEn: 'Gas · Tolls · Parking',
      href: (locale) => benefitClaimRoute(locale, 'BE-GAS-001'),
    },
    {
      id: 'referral',
      icon: <Stethoscope size={20} aria-hidden />,
      titleTh: 'ขอใบส่งตัว',
      titleEn: 'Hospital referral',
      subtitleTh: 'ePatient ก่อนเข้ารับบริการ',
      subtitleEn: 'ePatient before visit',
      href: (locale) => benefitReferralRoute(locale),
      badgeCount: pendingReferralCount,
    },
  ];
}

// ── Sub-component: plan chip ──────────────────────────────────────────────────

function planRoute(plan: BenefitPlan, locale: string): string {
  if (plan.recordType === 'records' || plan.recordType === 'info') {
    return `/${locale}/admin/benefits/records/${plan.id}`;
  }
  return benefitClaimRoute(locale, plan.id);
}

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
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'inline-flex items-center gap-1.5 whitespace-nowrap'
      )}
    >
      <FileText size={13} aria-hidden />
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

  const isTh = locale !== 'en';

  const [browseOpen, setBrowseOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PlanCategory | null>(null);

  const claimablePlans = getEmployeeClaimablePlans();
  const adminPlans = getAdminOnlyPlans();

  const visibleClaimable = activeCategory
    ? claimablePlans.filter((p) => p.category === activeCategory)
    : claimablePlans;

  const visibleAdmin = activeCategory
    ? adminPlans.filter((p) => p.category === activeCategory)
    : adminPlans;

  const primaryActions = buildPrimaryActions(pendingReferralCount);

  return (
    <section aria-labelledby="benefit-services-heading">
      <Card variant="raised" size="lg" className="border-accent-soft bg-canvas-soft">
        <header className="space-y-1">
          <CardEyebrow>{isTh ? 'งานสวัสดิการ' : 'Benefit services'}</CardEyebrow>
          <CardTitle id="benefit-services-heading">
            {isTh ? 'เริ่มงานที่ใช้บ่อย' : 'Start a common task'}
          </CardTitle>
          <p className="max-w-2xl text-body leading-relaxed text-ink-soft">
            {isTh
              ? 'เลือกประเภทคำขอที่ใช้บ่อยจาก 3 ปุ่มด้านล่าง — หรือคลิก “ดูสวัสดิการทั้งหมด” เพื่อค้นหาตามชื่อแผน'
              : 'Pick one of the three common tasks below — or click "Browse all benefits" to find a specific plan.'}
          </p>
        </header>

        {/* Primary action tiles */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {primaryActions.map((action) => (
            <Link
              key={action.id}
              href={action.href(locale)}
              className={cn(
                'group relative flex flex-col gap-2 rounded-[var(--radius-md)] border border-hairline bg-surface p-4',
                'shadow-[var(--shadow-sm)] transition-all hover:border-accent hover:shadow-[var(--shadow-md)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                {action.icon}
              </span>
              <div className="flex items-start justify-between gap-2">
                <p className="text-body font-semibold leading-snug text-ink">
                  {isTh ? action.titleTh : action.titleEn}
                </p>
                {typeof action.badgeCount === 'number' && action.badgeCount > 0 && (
                  <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[length:var(--text-eyebrow)] font-semibold leading-none tracking-[0.14em] text-warning">
                    {action.badgeCount}
                  </span>
                )}
              </div>
              <p className="text-small leading-relaxed text-ink-muted">
                {isTh ? action.subtitleTh : action.subtitleEn}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-small font-medium text-accent">
                {isTh ? 'เริ่มทำรายการ' : 'Start'}
                <ArrowRight
                  size={14}
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>

        {/* Browse-all toggle */}
        <button
          type="button"
          onClick={() => setBrowseOpen((v) => !v)}
          aria-expanded={browseOpen}
          aria-controls="benefit-services-browse"
          className={cn(
            'mt-5 inline-flex items-center gap-2 text-small font-semibold text-ink transition-colors hover:text-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-soft'
          )}
        >
          {browseOpen ? (
            <ChevronUp size={14} aria-hidden />
          ) : (
            <ChevronDown size={14} aria-hidden />
          )}
          {isTh
            ? `ดูสวัสดิการทั้งหมด (${claimablePlans.length} แผน)`
            : `Browse all benefits (${claimablePlans.length} plans)`}
        </button>

        {browseOpen && (
          <div id="benefit-services-browse" className="mt-4 space-y-4 border-t border-hairline pt-4">
            {/* Category filter */}
            <div>
              <p className="mb-2 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {isTh ? 'กรองตามหมวดหมู่' : 'Filter by category'}
              </p>
              <div
                role="group"
                aria-label={isTh ? 'หมวดหมู่สวัสดิการ' : 'Benefit categories'}
                className="flex flex-wrap gap-2"
              >
                <CategoryChip
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                  label={isTh ? 'ทั้งหมด' : 'All'}
                />
                {CLAIMABLE_CATEGORIES.map((cat) => {
                  if (!claimablePlans.some((p) => p.category === cat.id)) return null;
                  return (
                    <CategoryChip
                      key={cat.id}
                      active={activeCategory === cat.id}
                      onClick={() =>
                        setActiveCategory(cat.id === activeCategory ? null : cat.id)
                      }
                      label={isTh ? cat.labelTh : cat.labelEn}
                    />
                  );
                })}
                <Capability action="edit">
                  {ADMIN_CATEGORIES.map((cat) => {
                    if (!adminPlans.some((p) => p.category === cat.id)) return null;
                    return (
                      <CategoryChip
                        key={cat.id}
                        active={activeCategory === cat.id}
                        onClick={() =>
                          setActiveCategory(cat.id === activeCategory ? null : cat.id)
                        }
                        label={isTh ? cat.labelTh : cat.labelEn}
                        icon={<Shield size={11} aria-hidden className="opacity-60" />}
                      />
                    );
                  })}
                </Capability>
              </div>
            </div>

            {/* Claimable plans */}
            {visibleClaimable.length > 0 && (
              <div>
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

            {/* Admin records — gated */}
            <Capability action="edit">
              {visibleAdmin.length > 0 && (
                <div className="rounded-[var(--radius-md)] border border-hairline bg-surface p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    <Shield size={13} aria-hidden />
                    {isTh ? 'บันทึกโดย HR เท่านั้น' : 'HR records only'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleAdmin.map((plan) => (
                      <PlanChip key={plan.id} plan={plan} locale={locale} isTh={isTh} />
                    ))}
                  </div>
                </div>
              )}
            </Capability>
          </div>
        )}
      </Card>
    </section>
  );
}

// ── Sub-component: category filter chip ──────────────────────────────────────

function CategoryChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-hairline px-3 py-1 text-small font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        active
          ? 'border-accent bg-accent text-white'
          : 'bg-surface text-ink-soft hover:bg-canvas-soft hover:text-ink'
      )}
    >
      {icon}
      {label}
    </button>
  );
}
