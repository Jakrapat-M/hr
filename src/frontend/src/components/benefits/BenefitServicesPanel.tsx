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
  Receipt,
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

// ── Filter chip categories (used in collapsed catalog) ───────────────────────

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

  return (
    <section aria-labelledby="benefit-services-heading" className="space-y-4">
      {/* HERO — Hospital referral, prioritized for users who may be unwell */}
      <Card
        variant="raised"
        size="lg"
        className="humi-banner relative overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-40 w-32 rounded-full bg-[color:var(--color-butter)] opacity-50 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute right-32 top-20 h-24 w-20 rounded-full bg-[color:var(--color-sage)] opacity-40 blur-2xl"
        />
        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-3">
            <CardEyebrow>{isTh ? 'เริ่มต้นที่นี่ · ทำเร็วสุด' : 'Start here · fastest path'}</CardEyebrow>
            <h2
              id="benefit-services-heading"
              className={cn(
                'font-display font-semibold tracking-tight text-ink',
                'text-[length:var(--text-display-h1)] leading-[var(--text-display-h1--line-height)]'
              )}
            >
              {isTh ? 'ไม่สบายใช่ไหม? ขอใบส่งตัวเข้าโรงพยาบาล' : 'Feeling unwell? Request a hospital referral'}
            </h2>
            <p className="max-w-xl text-body leading-relaxed text-ink-soft">
              {isTh
                ? 'ส่งคำขอครั้งเดียว — กรอกในหน้าเดียว ไม่ต้องจำหลายขั้นตอน'
                : 'One short form — single page, no multi-step.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={benefitReferralRoute(locale)}
                className={cn(
                  buttonVariants({ variant: 'primary' }),
                  'gap-2 text-body'
                )}
              >
                <Stethoscope size={16} aria-hidden />
                {isTh ? 'ขอใบส่งตัวตอนนี้' : 'Request referral now'}
                <ArrowRight size={14} aria-hidden />
              </Link>
              {pendingReferralCount > 0 && (
                <span className="text-small text-ink-muted">
                  {isTh
                    ? `คุณมี ${pendingReferralCount} ใบส่งตัวที่กำลังดำเนินการ`
                    : `You have ${pendingReferralCount} pending referral${pendingReferralCount === 1 ? '' : 's'}`}
                </span>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 md:block">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-surface text-accent shadow-[var(--shadow-md)]">
              <Hospital size={56} aria-hidden strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </Card>

      {/* Secondary actions — claim entry points */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SecondaryAction
          locale={locale}
          isTh={isTh}
          icon={<Receipt size={20} aria-hidden />}
          titleTh="เบิกค่ารักษา / ทันตกรรม"
          titleEn="Medical & dental claim"
          subtitleTh="ส่งใบเสร็จย้อนหลัง — กรอกหน้าเดียว"
          subtitleEn="Submit receipts on a single form"
          href={benefitClaimRoute(locale, 'BE-MED-001')}
        />
        <SecondaryAction
          locale={locale}
          isTh={isTh}
          icon={<Fuel size={20} aria-hidden />}
          titleTh="เบิกค่าเดินทาง"
          titleEn="Transport claim"
          subtitleTh="น้ำมัน · ทางด่วน · ที่จอดรถ"
          subtitleEn="Gas · Tolls · Parking"
          href={benefitClaimRoute(locale, 'BE-GAS-001')}
        />
      </div>

      {/* Catalog browse — text link, deliberately understated */}
      <div>
        <button
          type="button"
          onClick={() => setBrowseOpen((v) => !v)}
          aria-expanded={browseOpen}
          aria-controls="benefit-services-browse"
          className={cn(
            'inline-flex items-center gap-1.5 text-small font-medium text-ink-soft transition-colors hover:text-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
          )}
        >
          {browseOpen ? (
            <ChevronUp size={14} aria-hidden />
          ) : (
            <ChevronDown size={14} aria-hidden />
          )}
          {isTh
            ? `ดูสวัสดิการทั้งหมด (${claimablePlans.length} แผน)`
            : `View all benefits (${claimablePlans.length} plans)`}
        </button>

        {browseOpen && (
          <Card
            variant="raised"
            size="md"
            id="benefit-services-browse"
            className="mt-3 space-y-4 bg-canvas-soft"
          >
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
          </Card>
        )}
      </div>
    </section>
  );
}

// ── Sub-component: secondary action card ──────────────────────────────────────

function SecondaryAction({
  locale: _locale,
  isTh,
  icon,
  titleTh,
  titleEn,
  subtitleTh,
  subtitleEn,
  href,
}: {
  locale: string;
  isTh: boolean;
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  subtitleTh: string;
  subtitleEn: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 rounded-[var(--radius-md)] border border-hairline bg-surface px-5 py-4',
        'shadow-[var(--shadow-sm)] transition-all hover:border-accent hover:shadow-[var(--shadow-md)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">{isTh ? titleTh : titleEn}</p>
        <p className="text-small text-ink-muted">{isTh ? subtitleTh : subtitleEn}</p>
      </div>
      <ArrowRight
        size={16}
        aria-hidden
        className="shrink-0 text-ink-muted transition-all group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
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
